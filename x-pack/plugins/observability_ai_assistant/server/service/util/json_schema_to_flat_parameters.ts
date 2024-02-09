/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema } from 'json-schema-to-ts';
import { castArray, isArray } from 'lodash';

interface Parameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  enum?: unknown[];
  constant?: unknown;
  array?: boolean;
}

export function jsonSchemaToFlatParameters(
  schema: JSONSchema,
  name: string = '',
  options: { required?: boolean; array?: boolean } = {}
): Parameter[] {
  if (typeof schema === 'boolean') {
    return [];
  }

  switch (schema.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'integer':
    case 'null':
      return [
        {
          name,
          type: schema.type,
          description: schema.description,
          array: options.array,
          required: options.required,
          constant: schema.const,
          enum: schema.enum !== undefined ? castArray(schema.enum) : schema.enum,
        },
      ];

    case 'array':
      if (
        typeof schema.items === 'boolean' ||
        typeof schema.items === 'undefined' ||
        isArray(schema.items)
      ) {
        return [];
      }
      return jsonSchemaToFlatParameters(schema.items as JSONSchema, name, {
        ...options,
        array: true,
      });

    default:
    case 'object':
      if (typeof schema.properties === 'undefined') {
        return [];
      }
      return Object.entries(schema.properties).flatMap(([key, subSchema]) => {
        return jsonSchemaToFlatParameters(subSchema, name ? `${name}.${key}` : key, {
          ...options,
          required: schema.required && schema.required.includes(key) ? true : false,
        });
      });
  }
}
