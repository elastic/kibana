/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InfraMetadata,
  InfraMetadataHost,
  InfraMetadataAgent,
  InfraMetadataCloud,
} from '../../../../../common/http_api';

export interface Field {
  name: string;
  value: string | string[] | undefined;
}

export const getAllFields = (metadata: InfraMetadata | null) => {
  if (!metadata?.info) return [];
  const tempPropertyMap = new Map();

  const mapNestedProperties = (
    category: 'host' | 'agent' | 'cloud',
    property: keyof InfraMetadataHost | keyof InfraMetadataCloud | keyof InfraMetadataHost
  ) => {
    tempPropertyMap.set(property, metadata?.info[`${category}`][property]);

    if (
      typeof tempPropertyMap.get(property) === 'string' ||
      typeof tempPropertyMap.get(property) === 'boolean' ||
      tempPropertyMap.get(property)?.length
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
      for (const [prop, subProp] of Object.entries(tempPropertyMap.get(property))) {
        subProps.push({
          name: `${category}.${property}.${prop}`,
          value: subProp,
        });
      }
      return subProps;
    }
  };

  const agent = Object.keys(metadata.info.agent ?? {}).flatMap((prop: keyof InfraMetadataAgent) =>
    mapNestedProperties('agent', prop)
  );
  const cloud = Object.keys(metadata.info.cloud ?? {}).flatMap((prop: keyof InfraMetadataCloud) =>
    mapNestedProperties('cloud', prop)
  );
  const host = Object.keys(metadata.info.host ?? {}).flatMap((prop: keyof InfraMetadataHost) =>
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
