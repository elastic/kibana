/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SearchHit } from '@kbn/es-types';
import { FieldMappingWithCount, getFieldMappingsWithCount } from './get_datastream_mappings';
import { DataStreamSettingDetails, getDataStreamSettings } from './get_datastream_settings';
import { DataStreamTemplateMetadata, getDataStreamTemplates } from './get_datastream_templates';
import { createDatasetQualityESClient } from '../../../utils';
import { getIgnoredDc } from './get_datastream_document';

export interface IgnoredMetadataResponse {
  ignoredMetadata: {
    mappings: FieldMappingWithCount;
    settings: DataStreamSettingDetails;
    templates: DataStreamTemplateMetadata;
    ignoredDocument: SearchHit;
  };
}

export async function getIgnoredMetadata({
  esClient,
  dataStream,
  field,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  field: string;
}): Promise<IgnoredMetadataResponse> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);
  const [mappingsData, settingData, templateData, ignoredDocument] = await Promise.all([
    getFieldMappingsWithCount({
      datasetQualityESClient,
      dataStream,
      field,
    }),
    getDataStreamSettings({
      datasetQualityESClient,
      dataStream,
    }),
    getDataStreamTemplates({
      datasetQualityESClient,
      dataStream,
      field,
    }),
    getIgnoredDc({
      datasetQualityESClient,
      dataStream,
      field,
    }),
  ]);

  return {
    ignoredMetadata: {
      mappings: mappingsData,
      settings: settingData,
      templates: templateData,
      ignoredDocument,
    },
  };
}
