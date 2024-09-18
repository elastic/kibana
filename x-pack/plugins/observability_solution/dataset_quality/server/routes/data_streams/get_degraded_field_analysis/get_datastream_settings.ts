/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
import { toBoolean } from '../../../utils/to_boolean';

export interface DataStreamSettingResponse {
  nestedFieldLimit?: number;
  totalFieldLimit: number;
  ignoreDynamicBeyondLimit?: boolean;
  ignoreMalformed?: boolean;
}

const DEFAULT_FIELD_LIMIT = 1000;
const DEFAULT_NESTED_FIELD_LIMIT = 50;

export async function getDataStreamSettings({
  datasetQualityESClient,
  dataStream,
  lastBackingIndex,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  lastBackingIndex: string;
}): Promise<DataStreamSettingResponse> {
  const settings = await datasetQualityESClient.settings({ index: dataStream });
  const indexSettings = settings[lastBackingIndex]?.settings?.index?.mapping;

  return {
    nestedFieldLimit: indexSettings?.nested_fields?.limit
      ? Number(indexSettings?.nested_fields?.limit)
      : DEFAULT_NESTED_FIELD_LIMIT,
    totalFieldLimit: indexSettings?.total_fields?.limit
      ? Number(indexSettings?.total_fields?.limit)
      : DEFAULT_FIELD_LIMIT,
    ignoreDynamicBeyondLimit: indexSettings?.total_fields?.ignore_dynamic_beyond_limit
      ? toBoolean(indexSettings?.total_fields?.ignore_dynamic_beyond_limit)
      : true, // In serverless this is always true and hence not present
    ignoreMalformed: toBoolean(indexSettings?.ignore_malformed),
  };
}
