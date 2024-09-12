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

type MappingWithFields = MappingTypeMapping & {
  fields: Record<PropertyName, MappingProperty>;
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
  const { count: fieldCount, capturedMapping: mapping } = countFields(properties ?? {}, field);
  const fieldPresent = mapping !== undefined;
  const fieldMapping = fieldPresent
    ? {
        type: mapping?.type,
        ignore_above: (mapping as any)?.ignore_above,
      }
    : undefined;

  console.table({
    field,
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

function isNestedProperty(property: MappingProperty): property is MappingWithProperty {
  return 'properties' in property && property.properties !== undefined;
}

function isNestedField(property: MappingProperty): property is MappingWithFields {
  return 'fields' in property && property.fields !== undefined;
}

function countFields(
  mappings: Record<PropertyName, MappingProperty>,
  captureField?: string,
  prefix = ''
): { count: number; capturedMapping?: any } {
  let fieldCount = 0;
  let capturedMapping;

  for (const field in mappings) {
    if (Object.prototype.hasOwnProperty.call(mappings, field)) {
      const mappingField = mappings[field];
      const currentPath = [prefix, field].filter(Boolean).join('.');

      // Capture the value if the current path matches the captureField
      if (captureField && currentPath === captureField) {
        capturedMapping = mappingField;
      }

      fieldCount++; // Count the current field

      // If there are properties, recursively count nested fields
      if (isNestedProperty(mappingField)) {
        const { count, capturedMapping: nestedCapturedValue } = countFields(
          mappingField.properties,
          captureField,
          currentPath
        );
        fieldCount += count;
        if (nestedCapturedValue !== undefined) {
          capturedMapping = nestedCapturedValue;
        }
      }

      // If there are fields, recursively count nested fields
      if (isNestedField(mappingField)) {
        const { count, capturedMapping: nestedCapturedValue } = countFields(
          mappingField.fields,
          captureField,
          currentPath
        );
        fieldCount += count;
        if (nestedCapturedValue !== undefined) {
          capturedMapping = nestedCapturedValue;
        }
      }
    }
  }

  return { count: fieldCount, capturedMapping };
}
