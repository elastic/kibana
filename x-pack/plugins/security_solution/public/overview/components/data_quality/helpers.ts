/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { has } from 'lodash/fp';

import type {
  EcsMetadata,
  EnrichedFieldMetadata,
  PartitionedFieldMetadata,
  PartitionedFieldMetadataStats,
} from './types';

export const getIndexNames = (
  mappings: Record<string, IndicesGetMappingIndexMappingRecord> | null
) => (mappings != null ? Object.keys(mappings) : []);

export interface FieldType {
  field: string;
  type: string;
}

function shouldReadKeys(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const getNextPathWithoutProperties = ({
  key,
  pathWithoutProperties,
  value,
}: {
  key: string;
  pathWithoutProperties: string;
  value: unknown;
}): string => {
  if (!pathWithoutProperties) {
    return key;
  }

  if (shouldReadKeys(value) && key === 'properties') {
    return `${pathWithoutProperties}`; // TODO: wrap required?
  } else {
    return `${pathWithoutProperties}.${key}`;
  }
};

export function getFieldTypes(mappingsProperties: Record<string, unknown>): FieldType[] {
  if (!shouldReadKeys(mappingsProperties)) {
    throw new TypeError(`Root value is not flatten-able, received ${mappingsProperties}`);
  }

  const result: FieldType[] = [];
  (function flatten(prefix, object, pathWithoutProperties) {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;

      const nextPathWithoutProperties = getNextPathWithoutProperties({
        key,
        pathWithoutProperties,
        value,
      });

      if (shouldReadKeys(value)) {
        flatten(path, value, nextPathWithoutProperties);
      } else {
        if (nextPathWithoutProperties.endsWith('.type')) {
          const pathWithoutType = nextPathWithoutProperties.slice(
            0,
            nextPathWithoutProperties.lastIndexOf('.type')
          );

          result.push({
            field: pathWithoutType,
            type: `${value}`,
          });
        }
      }
    }
  })('', mappingsProperties, '');

  return result;
}

export const getEnrichedFieldMetadata = ({
  ecsMetadata,
  fieldMetadata,
}: {
  ecsMetadata: Record<string, EcsMetadata>;
  fieldMetadata: FieldType;
}): EnrichedFieldMetadata => {
  const { field, type } = fieldMetadata;

  if (has(fieldMetadata.field, ecsMetadata)) {
    return {
      ...ecsMetadata[field],
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues: [], // TODO: read invalid values from index
      hasEcsMetadata: true,
      isEcsCompliant: type === ecsMetadata[field].type,
    };
  } else {
    return {
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues: [], // TODO: read invalid values from index
      hasEcsMetadata: false,
      isEcsCompliant: false,
    };
  }
};

export const getPartitionedFieldMetadata = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): PartitionedFieldMetadata =>
  enrichedFieldMetadata.reduce<PartitionedFieldMetadata>(
    (acc, x) => ({
      all: [...acc.all, x],
      ecsCompliant: x.isEcsCompliant ? [...acc.ecsCompliant, x] : acc.ecsCompliant,
      nonEcs: !x.hasEcsMetadata ? [...acc.nonEcs, x] : acc.nonEcs,
      notEcsCompliant:
        x.hasEcsMetadata && !x.isEcsCompliant ? [...acc.notEcsCompliant, x] : acc.notEcsCompliant,
    }),
    {
      all: [],
      ecsCompliant: [],
      nonEcs: [],
      notEcsCompliant: [],
    }
  );

export const getPartitionedFieldMetadataStats = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): PartitionedFieldMetadataStats => {
  const { all, ecsCompliant, nonEcs, notEcsCompliant } = partitionedFieldMetadata;

  return {
    all: all.length,
    ecsCompliant: ecsCompliant.length,
    nonEcs: nonEcs.length,
    notEcsCompliant: notEcsCompliant.length,
  };
};

export const hasValidTimestampMapping = (enrichedFieldMetadata: EnrichedFieldMetadata[]): boolean =>
  enrichedFieldMetadata.some(
    (x) => x.indexFieldName === '@timestamp' && x.indexFieldType === 'date'
  );
