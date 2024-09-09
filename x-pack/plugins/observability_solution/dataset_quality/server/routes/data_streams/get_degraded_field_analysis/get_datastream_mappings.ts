/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MappingTypeMapping,
  MappingProperty,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/types';
import { inspect } from 'util';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';

export interface DataStreamMappingResponse {
  fieldCount: number;
  fieldPresent: boolean;
  fieldMapping?: {
    type?: string;
    ignore_above?: number;
  };
}

type MappingWithProperty = MappingTypeMapping & {
  properties: Record<PropertyName, MappingProperty>;
};

export async function getDataStreamMapping({
  field,
  datasetQualityESClient,
  dataStream,
  lastBackingIndex,
}: {
  field: string;
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  lastBackingIndex: string;
}): Promise<DataStreamMappingResponse> {
  const mappings = await datasetQualityESClient.mappings({ index: dataStream });
  const properties = mappings[lastBackingIndex]?.mappings?.properties;
  const flattenedMappings = getFlattenedMappings(properties ?? {});
  const fieldCount = Object.keys(flattenedMappings).length;
  const fieldPresent = field in flattenedMappings;
  const mapping = flattenedMappings[field];
  const fieldMapping = fieldPresent
    ? {
        type: mapping?.type,
        ignore_above: (mapping as any)?.ignore_above,
      }
    : undefined;

  console.log(inspect(flattenedMappings, { depth: null }));

  console.table({
    fieldCount,
    fieldPresent,
    fieldMapping,
  });

  return {
    fieldCount,
    fieldPresent,
    fieldMapping,
  };
}

function getFlattenedMappings(
  properties: Record<PropertyName, MappingProperty>,
  prefix = ''
): Record<PropertyName, MappingProperty> {
  return Object.entries(properties).reduce((props, [propertyName, propertyObj]) => {
    const joinedPropertyName = [prefix, propertyName].filter(Boolean).join('.');

    if (isNestedProperty(propertyObj)) {
      return Object.assign(props, getFlattenedMappings(propertyObj.properties, joinedPropertyName));
    }

    props[joinedPropertyName] = propertyObj;
    return props;
  }, {} as Record<PropertyName, MappingProperty>);
}

function isNestedProperty(property: MappingProperty): property is MappingWithProperty {
  return (property as MappingTypeMapping).properties !== undefined;
}
