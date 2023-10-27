/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadata } from '../../../../../common/http_api';

export interface Field {
  name: string;
  value?: string | boolean | string[] | undefined;
}

export interface FieldsByCategoryValue {
  value?: string | boolean | string[] | undefined | { [key: string]: string };
}
export interface FieldsByCategory {
  [key: string]: FieldsByCategoryValue['value'];
}

export const getAllFields = (metadata: InfraMetadata | null) => {
  if (!metadata?.info) return [];
  const tempPropertyMap = new Map<string, FieldsByCategoryValue['value']>();

  const mapNestedProperties = (category: 'cloud' | 'host' | 'agent', property: string) => {
    const fieldsByCategory: FieldsByCategory = metadata?.info?.[`${category}`] ?? {};
    if (fieldsByCategory.hasOwnProperty(property)) {
      tempPropertyMap.set(property, fieldsByCategory[property]);

      if (
        typeof tempPropertyMap.get(property) === 'string' ||
        typeof tempPropertyMap.get(property) === 'boolean' ||
        Array.isArray(tempPropertyMap.get(property))
      ) {
        return {
          name: `${category}.${property}`,
          value:
            tempPropertyMap.get(property) === false
              ? String(tempPropertyMap.get(property))
              : tempPropertyMap.get(property),
        };
      } else {
        const subProps = [];
        for (const [prop, subProp] of Object.entries(tempPropertyMap.get(property) ?? {})) {
          subProps.push({
            name: `${category}.${property}.${prop}`,
            value: subProp,
          });
        }
        return subProps;
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

  return prune([...host, ...agent, ...cloud]);
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
