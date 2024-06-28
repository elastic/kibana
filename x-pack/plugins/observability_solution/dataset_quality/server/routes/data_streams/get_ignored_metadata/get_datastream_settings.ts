/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesMappingLimitSettings } from '@elastic/elasticsearch/lib/api/types';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';

export interface DataStreamSettingDetails {
  totalFieldLimit: number | undefined;
  ignoreDynamicBeyondLimit: number | undefined;
  nestedFieldLimit: number | undefined;
  ignoreMalformed: boolean | undefined;
  mappingInsideIndexSettings: IndicesMappingLimitSettings | undefined;
  pipelines: {
    defaultPipeline: string | undefined;
    finalPipeline: string | undefined;
  };
}

export async function getDataStreamSettings({
  datasetQualityESClient,
  dataStream,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
}): Promise<DataStreamSettingDetails> {
  const wholeSettings = await datasetQualityESClient.settings({ index: dataStream });
  const indexName = Object.keys(wholeSettings)[0];

  const totalFields = wholeSettings[indexName]?.settings?.index?.mapping?.total_fields;
  // This TS error is expected because the `ignore_dynamic_beyond_limit` field is not defined in the type
  // Remove this probably "after" 8.15 when this PR is merged: https://github.com/elastic/elasticsearch-specification/pull/2653
  // @ts-expect-error
  const ignoreDynamicBeyondLimit = totalFields?.ignore_dynamic_beyond_limit;

  return {
    totalFieldLimit: wholeSettings[indexName]?.settings?.index?.mapping?.total_fields?.limit,
    ignoreDynamicBeyondLimit,
    nestedFieldLimit: wholeSettings[indexName]?.settings?.index?.mapping?.nested_fields?.limit,
    ignoreMalformed: wholeSettings[indexName]?.settings?.index?.mapping?.ignore_malformed,
    mappingInsideIndexSettings: wholeSettings[indexName]?.settings?.index?.mapping,
    pipelines: {
      defaultPipeline: wholeSettings[indexName]?.settings?.index?.default_pipeline,
      finalPipeline: wholeSettings[indexName]?.settings?.index?.final_pipeline,
    },
  };
}
