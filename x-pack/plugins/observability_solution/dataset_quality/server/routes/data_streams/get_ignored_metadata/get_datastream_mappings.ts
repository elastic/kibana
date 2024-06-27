/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IndicesGetMappingResponse, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createDatasetQualityESClient } from '../../../utils';

export interface FieldMappingWithCount {
  fieldCount: number;
  mappings: Record<string, MappingProperty>;
  isDynamic: string | boolean | undefined;
}

export async function getFieldMappingsWithCount({
  esClient,
  dataStream,
  field,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  field: string;
}): Promise<FieldMappingWithCount> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const wholeMapping = await datasetQualityESClient.mappings({ index: dataStream });
  const indexName = Object.keys(wholeMapping)[0];

  const mappingForField = getMappingForField(wholeMapping, indexName, field);

  const fieldCaps = await datasetQualityESClient.fieldCaps({
    index: dataStream,
    fields: ['*'],
  });
  const totalFields = Object.keys(fieldCaps.fields).length;
  return {
    mappings: mappingForField,
    fieldCount: totalFields,
    isDynamic: wholeMapping[indexName].mappings.dynamic,
  };
}

function getMappingForField(mapping: IndicesGetMappingResponse, indexName: string, path: string) {
  const pathParts = path.split('.');
  const numDots = pathParts.length - 1;
  const targetDepth = numDots > 2 ? numDots - 1 : numDots;
  let currentObject = mapping[indexName].mappings.properties ?? {};

  for (let i = 0; i < targetDepth; i++) {
    const part = pathParts[i];
    if (currentObject[part]) {
      if ('properties' in currentObject[part]) {
        currentObject = (currentObject[part] as any).properties;
      } else if ('fields' in currentObject[part]) {
        currentObject = (currentObject[part] as any).fields;
      } else {
        currentObject = {};
      }
    } else {
      currentObject = {};
    }
  }

  return { [path]: currentObject };
}
