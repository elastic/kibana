/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import joiToJsonSchema from 'joi-to-json';
import type { Type } from '@kbn/config-schema';
import { castArray, isPlainObject, forEach, unset } from 'lodash';
import type { CompatibleJSONSchema } from '../../common/functions/types';

function dropUnknownProperties(object: CompatibleJSONSchema) {
  if (!isPlainObject(object)) {
    return object;
  }

  forEach(object, (value, key) => {
    switch (key) {
      case 'type':
      case 'minLength':
      case 'maxLength':
      case 'required':
      case 'description':
        break;

      case 'enum':
      case 'const':
      case 'items':
      case 'allOf':
      case 'anyOf':
      case 'oneOf':
        castArray(value).forEach((innerSchema) => {
          if (isPlainObject(innerSchema)) {
            dropUnknownProperties(innerSchema as CompatibleJSONSchema);
          }
        });
        break;

      case 'properties':
        forEach(object.properties, (propertyValue, propertyKey) => {
          dropUnknownProperties(propertyValue);
        });
        break;

      default:
        unset(object, key);
        break;
    }
  });

  return object;
}

export function convertSchemaToOpenApi(typeSchema: Type<any>): CompatibleJSONSchema {
  const plainOpenApiSchema = joiToJsonSchema(typeSchema.getSchema(), 'open-api');

  return dropUnknownProperties(plainOpenApiSchema);
}
