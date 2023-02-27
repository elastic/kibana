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
  SchemaFieldIndex,
} from '../../../common/types/engines';

export const fetchEngineFieldCapabilities = async (
  client: IScopedClusterClient,
  engine: EnterpriseSearchEngineDetails
): Promise<EnterpriseSearchEngineFieldCapabilities> => {
  const { created, name, updated } = engine;
  const fieldCapabilities = await client.asCurrentUser.fieldCaps({
    fields: '*',
    include_unmapped: true,
    index: getEngineIndexAliasName(name),
  });
  const fields = parseFieldsCapabilities(fieldCapabilities);
  return {
    created,
    field_capabilities: fieldCapabilities,
    fields,
    name,
    updated,
  };
};

// Note: This will likely need to be modified when engines move to es module
const getEngineIndexAliasName = (engineName: string): string => `search-engine-${engineName}`;

export const parseFieldsCapabilities = (fieldCaps: FieldCapsResponse): SchemaField[] => {
  const { fields } = fieldCaps;
  return Object.entries<Record<string, FieldCapsFieldCapability>>(fields)
    .filter(([fieldName]) => isTopLevelField(fieldName))
    .map(([fieldName, fieldValue]) => ({
      ...parseFieldCapability(
        fieldValue,
        fieldCaps.indices,
        getSubFieldCapabilities(fieldName, fields)
      ),
      name: fieldName,
    }));
};

export const isTopLevelField = (fieldName: string): boolean => {
  if (fieldName.startsWith('_')) return false;
  if (fieldName.includes('.')) return false;
  return true;
};

export const parseFieldCapability = (
  value: Record<string, FieldCapsFieldCapability>,
  indices: string | string[],
  subFields: SubField[]
): { fields?: SchemaField[]; indices: SchemaFieldIndex[]; type: string } => {
  const typeKeys = Object.keys(value);
  if (typeKeys.length === 0) {
    return {
      indices: indicesWithMatchingType('unknown', indices),
      type: 'unknown',
    };
  }
  let fields: SchemaField[] | undefined;
  if (subFields.length > 0) {
    fields = subFields
      .filter(({ path }) => path.length === 1)
      .map((subfield) => {
        return {
          ...parseFieldCapability(
            subfield.capability,
            indices,
            getSubFields(subfield.path[0], subFields)
          ),
          name: subfield.path[0],
        };
      });
  }
  if (typeKeys.length === 1) {
    return {
      fields,
      indices: indicesWithMatchingType(value[typeKeys[0]].type, indices),
      type: value[typeKeys[0]].type,
    };
  }
  let type: string;
  if ('unmapped' in value && typeKeys.length === 2) {
    type = typeKeys.filter((v) => v !== 'unmapped')[0];
  } else {
    type = 'conflict';
  }
  const fieldIndices: SchemaFieldIndex[] = [];
  for (const fieldCapability of Object.values<FieldCapsFieldCapability>(value)) {
    if (fieldCapability.indices) {
      fieldIndices.push(...indicesWithMatchingType(fieldCapability.type, fieldCapability.indices));
    }
  }
  return {
    fields,
    indices: fieldIndices,
    type,
  };
};

const indicesWithMatchingType = (type: string, indices: string | string[]): SchemaFieldIndex[] => {
  if (typeof indices === 'string') {
    return [
      {
        name: indices,
        type,
      },
    ];
  }
  return indices.map((name) => ({ name, type }));
};

interface SubField {
  capability: Record<string, FieldCapsFieldCapability>;
  path: string[];
}
const getSubFieldCapabilities = (
  name: string,
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
): SubField[] => {
  const result = Object.entries<Record<string, FieldCapsFieldCapability>>(fields)
    .filter(([fieldName]) => fieldName.startsWith(`${name}.`))
    .map(([fieldName, capability]) => {
      const path = fieldName.split('.');
      path.shift();
      return {
        capability,
        path,
      };
    });
  return result;
};

const getSubFields = (name: string, fields: SubField[]) => {
  return fields
    .filter((field) => field.path[0] === name && field.path.length > 1)
    .map((field) => {
      const path = [...field.path];
      path.shift();
      return {
        ...field,
        path,
      };
    });
};
