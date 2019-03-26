/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, isArray, isEmpty, isNumber, isString, memoize, pick } from 'lodash/fp';

import {
  auditbeatSchema,
  baseCategoryFields,
  ecsSchema,
  extraSchemaField,
  filebeatSchema,
  packetbeatSchema,
} from './8.0.0';
import { IndexAlias, OutputSchema, Schema, SchemaFields, SchemaItem } from './type';

export * from './type';
export { baseCategoryFields };
export const convertSchemaToAssociativeArray = (schema: Schema): OutputSchema =>
  schema.reduce((accumulator: OutputSchema, item: Partial<SchemaItem>) => {
    if (item.fields != null && !isEmpty(item.fields)) {
      return {
        ...accumulator,
        ...convertFieldsToAssociativeArray(item),
      };
    }
    return accumulator;
  }, {});

const paramsToPick = ['description', 'example', 'name', 'type'];

const onlyStringOrNumber = (fields: object) =>
  Object.keys(fields).reduce((acc, item) => {
    const value = get(item, fields);
    return {
      ...acc,
      [item]: isString(value) || isNumber(value) ? value : JSON.stringify(value),
    };
  }, {});

const convertFieldsToAssociativeArray = (
  schemaFields: Partial<SchemaItem | SchemaFields>,
  path: string = ''
): OutputSchema =>
  schemaFields.fields && isArray(schemaFields.fields)
    ? schemaFields.fields.reduce((accumulator: OutputSchema, item: Partial<SchemaFields>) => {
        if (item.name) {
          const attr = isEmpty(path) ? item.name : `${path}.${item.name}`;
          if (!isEmpty(item.fields) && isEmpty(path)) {
            return {
              ...accumulator,
              [attr]: {
                ...onlyStringOrNumber(pick(paramsToPick, item)),
                fields: {
                  ...convertFieldsToAssociativeArray(item, attr),
                },
              },
            };
          } else if (!isEmpty(item.fields) && !isEmpty(path)) {
            return {
              ...accumulator,
              [attr]: onlyStringOrNumber(pick(paramsToPick, item)),
              ...convertFieldsToAssociativeArray(item, attr),
            };
          } else {
            return {
              ...accumulator,
              [attr]: onlyStringOrNumber(pick(paramsToPick, item)),
            };
          }
        }
        return accumulator;
      }, {})
    : {};

export const getIndexAlias = (indexName: string): IndexAlias => {
  if (indexName.toLocaleLowerCase().includes('auditbeat')) {
    return 'auditbeat';
  } else if (indexName.toLocaleLowerCase().includes('filebeat')) {
    return 'filebeat';
  } else if (indexName.toLocaleLowerCase().includes('packetbeat')) {
    return 'packetbeat';
  }
  return 'unknown';
};

export const getIndexSchemaDoc = memoize((index: IndexAlias) => {
  if (index === 'auditbeat') {
    return {
      ...extraSchemaField,
      ...convertSchemaToAssociativeArray(auditbeatSchema),
    };
  } else if (index === 'filebeat') {
    return {
      ...extraSchemaField,
      ...convertSchemaToAssociativeArray(filebeatSchema),
    };
  } else if (index === 'packetbeat') {
    return {
      ...extraSchemaField,
      ...convertSchemaToAssociativeArray(packetbeatSchema),
    };
  } else if (index === 'ecs') {
    return {
      ...extraSchemaField,
      ...ecsSchema,
    };
  }
  return {};
});

export const hasDocumentation = (index: IndexAlias, path: string): boolean => {
  if (index === 'unknown') {
    return false;
  }
  const splitPath = path.split('.');
  const category = splitPath.length > 0 ? splitPath[0] : null;
  if (category === null) {
    return false;
  }
  if (splitPath.length > 1) {
    return has([category, 'fields', path], getIndexSchemaDoc(index));
  }
  return has(category, getIndexSchemaDoc(index));
};

export const getDocumentation = (index: IndexAlias, path: string) => {
  if (index === 'unknown') {
    return '';
  }
  const splitPath = path.split('.');
  const category = splitPath.length > 0 ? splitPath[0] : null;
  if (category === null) {
    return '';
  }
  if (splitPath.length > 1) {
    return get([category, 'fields', path], getIndexSchemaDoc(index)) || '';
  }
  return get(category, getIndexSchemaDoc(index)) || '';
};
