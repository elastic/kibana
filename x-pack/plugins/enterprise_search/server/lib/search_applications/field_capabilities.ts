/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import {
  EnterpriseSearchApplication,
  EnterpriseSearchApplicationFieldCapabilities,
  SchemaField,
} from '../../../common/types/search_applications';

import { availableIndices } from './available_indices';
import { fetchAliasIndices } from './fetch_alias_indices';

export const fetchSearchApplicationFieldCapabilities = async (
  client: IScopedClusterClient,
  searchApplication: EnterpriseSearchApplication
): Promise<EnterpriseSearchApplicationFieldCapabilities> => {
  const { name, updated_at_millis } = searchApplication;

  const indices = await fetchAliasIndices(client, name);

  const availableIndicesList = await availableIndices(client, indices);

  if (!availableIndicesList.length) {
    return {
      fields: [],
      name,
      updated_at_millis,
    };
  }

  const fieldCapabilities = await client.asCurrentUser.fieldCaps({
    fields: '*',
    filters: '-metadata',
    include_unmapped: true,
    index: availableIndicesList,
  });

  const fields = parseFieldsCapabilities(fieldCapabilities);
  return {
    fields,
    name,
    updated_at_millis,
  };
};

const ensureIndices = (indices: string[] | string | undefined): string[] => {
  if (!indices) return [];
  return Array.isArray(indices) ? indices : [indices];
};

export const parseFieldsCapabilities = (fieldCapsResponse: FieldCapsResponse): SchemaField[] => {
  const { fields, indices: indexOrIndices } = fieldCapsResponse;
  const indices = ensureIndices(indexOrIndices);

  return Object.entries(fields)
    .map(([fieldName, typesObject]) => {
      const typeValues = Object.values(typesObject);
      const type = calculateType(Object.keys(typesObject));

      const indicesToType = typeValues.reduce(
        (acc: Record<string, string>, { type: indexType, indices: typeIndexOrIndices }) => {
          const typeIndices = ensureIndices(typeIndexOrIndices);
          typeIndices.forEach((index) => {
            acc[index] = indexType;
          });
          return acc;
        },
        {}
      );

      const fieldIndices =
        Object.keys(indicesToType).length > 0
          ? indices.map((index) => {
              const indexType = indicesToType[index] || 'unmapped';
              return {
                name: index,
                type: indexType,
              };
            })
          : indices.map((index) => ({
              name: index,
              type,
            }));

      const searchable = Object.values(typesObject).some((t) => t.searchable);
      const aggregatable = Object.values(typesObject).some((t) => t.aggregatable);
      const metadataField = Object.values(typesObject).every((t) => t.metadata_field);

      return {
        aggregatable,
        indices: fieldIndices,
        name: fieldName,
        searchable,
        type,
        ...(metadataField === undefined ? {} : { metadata_field: metadataField }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name)) as SchemaField[];
};

const calculateType = (types: string[]): string => {
  // If there is only one type, return it
  if (types.length === 1) return types[0];

  // Unmapped types are ignored for the purposes of determining the type
  // If all of the mapped types are the same, return that type
  const mapped = types.filter((t) => t !== 'unmapped');
  if (new Set(mapped).size === 1) return mapped[0];

  // Otherwise there is a conflict
  return 'conflict';
};
