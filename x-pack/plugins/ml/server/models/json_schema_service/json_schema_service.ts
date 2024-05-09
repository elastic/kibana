/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { type SupportedPath } from '../../../common/api_schemas/json_schema_schema';
import { jsonSchemaOverrides } from './schema_overrides';
import { type PropertyDefinition } from './types';

const supportedEndpoints = [
  {
    path: '/_ml/anomaly_detectors/{job_id}' as const,
    method: 'put',
  },
  {
    path: '/_ml/datafeeds/{datafeed_id}' as const,
    method: 'put',
  },
];

/**
 *
 */
export class JsonSchemaService {
  /**
   * Dictionary with the schema components
   * @private
   */
  private _schemaComponents: Record<string, PropertyDefinition> = {};

  private _requiredComponents: Set<string> = new Set<string>();

  /**
   * Extracts properties definition
   * @private
   */
  private extractProperties(propertyDef: PropertyDefinition): void {
    for (const key in propertyDef) {
      if (propertyDef.hasOwnProperty(key)) {
        const propValue = propertyDef[key as keyof PropertyDefinition]!;

        if (key === '$ref') {
          const comp = (propValue as string).split('/');
          const refKey = comp[comp.length - 1];

          delete propertyDef.$ref;

          // FIXME there is an issue with the maximum call stack size exceeded
          if (!refKey.startsWith('Ml_Types_')) return;

          const schemaComponent = this._schemaComponents[refKey];

          this._requiredComponents.add(refKey);

          Object.assign(propertyDef, schemaComponent);

          this.extractProperties(propertyDef);
        }

        if (Array.isArray(propValue)) {
          propValue.forEach((v) => {
            if (typeof v === 'object') {
              this.extractProperties(v);
            }
          });
        } else if (typeof propValue === 'object') {
          this.extractProperties(propValue as PropertyDefinition);
        }
      }
    }
  }

  private applyOverrides(path: SupportedPath, schema: PropertyDefinition): PropertyDefinition {
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
  public async extractSchema(path: SupportedPath, method: string, schema?: object) {
    const fileContent =
      schema ?? JSON.parse(Fs.readFileSync(Path.resolve(__dirname, 'openapi.json'), 'utf8'));

    const definition = fileContent.paths[path][method];

    if (!definition) {
      throw new Error('Schema definition is not defined');
    }

    const bodySchema = definition.requestBody.content['application/json'].schema;

    this._schemaComponents = fileContent.components.schemas;

    this.extractProperties(bodySchema);

    return this.applyOverrides(path, bodySchema);
  }

  /**
   * Generates openapi file, removing redundant content.
   * Only used internally via a node command to generate the file.
   */
  public async generateSchemaFile() {
    const schema = JSON.parse(
      Fs.readFileSync(Path.resolve(__dirname, 'openapi_source.json'), 'utf8')
    );

    await Promise.all(
      supportedEndpoints.map(async (e) => {
        // need to extract schema in order to keep required components
        await this.extractSchema(e.path, e.method, schema);
      })
    );

    for (const pathName in schema.paths) {
      if (!schema.paths.hasOwnProperty(pathName)) continue;

      const supportedEndpoint = supportedEndpoints.find((v) => v.path === pathName);
      if (supportedEndpoint) {
        for (const methodName in schema.paths[pathName]) {
          if (methodName !== supportedEndpoint.method) {
            delete schema.paths[pathName][methodName];
          }
        }
      } else {
        delete schema.paths[pathName];
      }
    }

    const components = schema.components.schemas;
    for (const componentName in components) {
      if (!this._requiredComponents.has(componentName)) {
        delete components[componentName];
      }
    }

    Fs.writeFileSync(Path.resolve(__dirname, 'openapi.json'), JSON.stringify(schema, null, 2));
  }
}
