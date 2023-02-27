/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { jsonSchemaOverrides } from './schema_overrides';
import { type PropertyDefinition } from './types';

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
    for (const key in propertyDef) {
      if (propertyDef.hasOwnProperty(key)) {
        if (key === '$ref') {
          const comp = propertyDef[key].split('/');
          const refKey = comp[comp.length - 1];

          delete propertyDef.$ref;

          // FIXME there is an issue with the maximum call stack size exceeded
          if (!refKey.startsWith('Ml_Types_')) return;

          const schemaComponent = this._schemaComponents[refKey];

          for (const k in schemaComponent) {
            if (schemaComponent.hasOwnProperty(k)) {
              // @ts-ignore
              propertyDef[k] = schemaComponent[k] as PropertyDefinition[typeof k];
            }
          }
          this.extractProperties(propertyDef);
        }

        if (Array.isArray(propertyDef[key])) {
          propertyDef[key].forEach((v) => {
            if (typeof v === 'object') {
              this.extractProperties(v);
            }
          });
        } else if (typeof propertyDef[key] === 'object') {
          this.extractProperties(propertyDef[key]);
        }
      }
    }
  }

  private applyOverrides(path: string, schema: PropertyDefinition): PropertyDefinition {
    const overrides = jsonSchemaOverrides[path];
    return {
      ...schema,
      ...overrides,
      properties: {
        ...schema.properties,
        ...overrides.properties,
      },
    };
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

    return this.applyOverrides(path, bodySchema);
  }
}
