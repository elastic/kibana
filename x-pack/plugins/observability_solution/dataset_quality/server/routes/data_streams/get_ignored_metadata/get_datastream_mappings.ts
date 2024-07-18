/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingDynamicTemplate, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { getMappingForField, getPossibleMatchingDynamicTemplates } from './utils';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';

export interface FieldMappingWithCount {
  fieldCount: number;
  mappings: MappingProperty | Record<string, MappingProperty> | undefined;
  isDynamic: string | boolean | undefined;
  possibleMatchingDynamicTemplates: MappingDynamicTemplate[];
}

export async function getFieldMappingsWithCount({
  datasetQualityESClient,
  dataStream,
  field,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  field: string;
}): Promise<FieldMappingWithCount> {
  const wholeMapping = await datasetQualityESClient.mappings({ index: dataStream });
  const indexName = Object.keys(wholeMapping)[0];

  const dynamicTemplates = wholeMapping[indexName].mappings.dynamic_templates;
  const possibleMatchingDynamicTemplates = getPossibleMatchingDynamicTemplates({
    dynamicTemplates,
    field,
  });

  const mappingForField = getMappingForField(wholeMapping[indexName].mappings, field);

  const fieldCaps = await datasetQualityESClient.fieldCaps({
    index: dataStream,
    fields: ['*'],
  });
  const totalFields = Object.keys(fieldCaps.fields).length;
  return {
    mappings: mappingForField,
    fieldCount: totalFields,
    isDynamic: wholeMapping[indexName].mappings.dynamic,
    possibleMatchingDynamicTemplates,
  };
}
