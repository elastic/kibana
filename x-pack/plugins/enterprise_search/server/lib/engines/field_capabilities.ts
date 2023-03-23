/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse, FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import {
  EnterpriseSearchEngineDetails,
  EnterpriseSearchEngineFieldCapabilities,
  SchemaField,
} from '../../../common/types/engines';

export const fetchEngineFieldCapabilities = async (
  client: IScopedClusterClient,
  engine: EnterpriseSearchEngineDetails
): Promise<EnterpriseSearchEngineFieldCapabilities> => {
  const { name, updated_at_millis } = engine;
  const fieldCapabilities = await client.asCurrentUser.fieldCaps({
    fields: '*',
    include_unmapped: true,
    index: getEngineIndexAliasName(name),
  });
  const fields = parseFieldsCapabilities(fieldCapabilities);
  return {
    field_capabilities: fieldCapabilities,
    fields,
    name,
    updated_at_millis,
  };
};

const ensureIndices = (indices: string | string[] | undefined): string[] => {
  if (!indices) return [];
  return Array.isArray(indices) ? indices : [indices];
};

export const parseFieldsCapabilities = (
  fieldCapsResponse: FieldCapsResponse,
  prefix: string = ''
): SchemaField[] => {
  const { fields, indices: indexOrIndices } = fieldCapsResponse;
  const inThisPass: Array<[string, Record<string, FieldCapsFieldCapability>]> = Object.entries(
    fields
  )
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => [key.replace(prefix, ''), value]);

  const atThisLevel = inThisPass.filter(([key]) => !key.includes('.'));

  return atThisLevel.map(([name, value]) => {
    const type = calculateType(Object.keys(value));
    let indices = Object.values(value).flatMap((fieldCaps) => {
      return ensureIndices(fieldCaps.indices).map((index) => ({
        name: index,
        type: fieldCaps.type,
      }));
    });

    indices =
      indices.length === 0
        ? ensureIndices(indexOrIndices).map((index) => ({ name: index, type }))
        : indices;

    const subFields = parseFieldsCapabilities(fieldCapsResponse, `${prefix}${name}.`);
    return {
      fields: subFields,
      indices,
      name,
      type,
    };
  });
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

// Note: This will likely need to be modified when engines move to es module
const getEngineIndexAliasName = (engineName: string): string => `search-engine-${engineName}`;
