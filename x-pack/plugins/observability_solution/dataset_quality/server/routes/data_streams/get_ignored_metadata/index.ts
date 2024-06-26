/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FieldMappingWithCount, getFieldMappingsWithCount } from './get_datastream_mappings';
import { DataStreamSettingDetails, getDataStreamSettings } from './get_datastream_settings';

export interface IgnoredMetadataResponse {
  ignoredMetadata: {
    mappings: FieldMappingWithCount;
    settings: DataStreamSettingDetails;
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
  const [mappingsData, settingData] = await Promise.all([
    getFieldMappingsWithCount({
      esClient,
      dataStream,
      field,
    }),
    getDataStreamSettings({
      esClient,
      dataStream,
    }),
  ]);

  return {
    ignoredMetadata: {
      mappings: mappingsData,
      settings: settingData,
    },
  };
}
