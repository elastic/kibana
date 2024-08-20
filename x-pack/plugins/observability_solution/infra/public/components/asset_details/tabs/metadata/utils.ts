/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { InfraMetadata } from '../../../../../common/http_api';

export interface Field {
  name: string;
  value?: string | string[];
}
interface FieldsByCategory {
  [key: string]: string | boolean | string[] | { [key: string]: string };
}

export const getAllFields = (metadata?: InfraMetadata) => {
  if (!metadata?.info) return [];

  const mapNestedProperties = (
    category: 'cloud' | 'host' | 'agent' | 'container',
    property: string
  ) => {
    const fieldsByCategory: FieldsByCategory = metadata?.info?.[`${category}`] ?? {};
    if (Object.hasOwn(fieldsByCategory, property)) {
      const value = fieldsByCategory[property];

      if (typeof value === 'boolean') {
        return {
          name: `${category}.${property}`,
          value: String(value),
        };
      }

      if (typeof value === 'string' || Array.isArray(value)) {
        return {
          name: `${category}.${property}`,
          value,
        };
      } else {
        return Object.entries(value ?? {})
          .map(([prop, subProp]) => {
            if (!Array.isArray(subProp) && isPlainObject(subProp)) {
              return { name: '', value: '' };
            }
            return {
              name: `${category}.${property}.${prop}`,
              value: subProp,
            };
          })
          .filter(({ name }) => name);
      }
    }
    return [];
  };

  const agent = Object.keys(metadata.info.agent ?? {}).flatMap((prop) =>
    mapNestedProperties('agent', prop)
  );
  const cloud = Object.keys(metadata.info.cloud ?? {}).flatMap((prop) =>
    mapNestedProperties('cloud', prop)
  );
  const host = Object.keys(metadata?.info?.host ?? {}).flatMap((prop) =>
    mapNestedProperties('host', prop)
  );
  const container = Object.keys(metadata?.info?.container ?? {}).flatMap((prop) =>
    mapNestedProperties('container', prop)
  );

  return prune([...host, ...container, ...agent, ...cloud]);
};

const prune = (fields: Field[]) => fields.filter((f) => !!f?.value);

export const getRowsWithPins = (rows: Field[], pinnedItems: Array<Field['name']>) => {
  if (pinnedItems.length > 0) {
    const { pinned, other } = rows.reduce(
      (acc, row) => {
        (pinnedItems.includes(row.name) ? acc.pinned : acc.other).push(row);
        return acc;
      },
      { pinned: [] as Field[], other: [] as Field[] }
    );
    return [...pinned, ...other];
  }
};
