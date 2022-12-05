/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

export interface PropertyDefinition {
  properties?: Record<string, PropertyDefinition>;
  type: string;
  description: string;
  $ref?: string;
  items?: PropertyDefinition;
  anyOf?: PropertyDefinition[];
}

export class JsonSchemaService {
  /**
   * Dictionary with the schema components
   * @private
   */
  private _schemaComponents: Record<string, PropertyDefinition> = {};

  /**
   * Extracts properties definition
   * @private
   */
  private extractProperties(propertyDef: PropertyDefinition): void {
    if (propertyDef.$ref) {
      const comp = propertyDef.$ref.split('/');
      const refKey = comp[comp.length - 1];

      // Some ES query types can't be resolved
      if (!refKey.startsWith('Ml_Types_')) return;

      const schemaComponent = this._schemaComponents[refKey];

      delete propertyDef.$ref;

      for (const key in schemaComponent) {
        if (schemaComponent.hasOwnProperty(key)) {
          // @ts-ignore
          propertyDef[key] = schemaComponent[key] as PropertyDefinition[typeof key];
        }
      }
    }

    if (propertyDef.properties) {
      for (const key in propertyDef.properties) {
        if (propertyDef.properties.hasOwnProperty(key)) {
          this.extractProperties(propertyDef.properties[key]);
        }
      }
    }

    if (propertyDef.items) {
      this.extractProperties(propertyDef.items);
    }

    if (propertyDef.anyOf) {
      for (const a of propertyDef.anyOf) {
        this.extractProperties(a);
      }
    }
  }

  /**
   * Extracts resolved schema definition for requested path and method
   * @param path
   * @param method
   */
  public async extractSchema(path: string, method: string) {
    const fileContent = JSON.parse(
      Fs.readFileSync(Path.resolve(__dirname, 'openapi.json'), 'utf8')
    );

    const definition = fileContent.paths[path][method];

    if (!definition) {
      throw new Error('Definition is not defined');
    }

    const bodySchema = definition.requestBody.content['application/json'].schema;

    this._schemaComponents = fileContent.components.schemas;

    this.extractProperties(bodySchema);

    return bodySchema;
  }
}
