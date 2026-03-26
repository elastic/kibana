/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ScoutLogger } from '@kbn/scout';

type SampleDataType = 'ecommerce' | 'flights' | 'logs';

async function loadSampleDataAndGetIndex({
  log,
  kbnClient,
  sampleDataId,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
  sampleDataId: SampleDataType;
}): Promise<string> {
  log.info('Loading sample data...');

  const response = await kbnClient.request<{
    elasticsearchIndicesCreated: Record<string, number>;
    kibanaSavedObjectsLoaded: number;
  }>({ method: 'POST', path: `/api/sample_data/${sampleDataId}` });

  const indexName = Object.keys(response.data.elasticsearchIndicesCreated)[0];
  log.info(`Sample data index created: ${indexName}`);
  return indexName;
}

export async function createMLJobsWithSampleData({
  log,
  kbnClient,
  sampleDataId,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
  sampleDataId: SampleDataType;
}): Promise<void> {
  const sampleDataIndex = await loadSampleDataAndGetIndex({ log, kbnClient, sampleDataId });

  // Get time range for the sample data
  const timeRangeResponse = await kbnClient.request<{
    success: boolean;
    start: number;
    end: number;
  }>({
    method: 'POST',
    path: '/internal/ml/fields_service/time_field_range',
    body: {
      index: sampleDataIndex,
      timeFieldName: 'timestamp',
      query: {
        bool: {
          must_not: {
            term: {
              _tier: 'data_frozen',
            },
          },
        },
      },
      runtimeMappings: {
        hour_of_day: {
          type: 'long',
          script: {
            source: "emit(doc['timestamp'].value.getHour());",
          },
        },
      },
    },
    headers: { 'elastic-api-version': '1' },
  });

  log.debug('Creating ML jobs from logs sample data');
  await kbnClient.request({
    method: 'POST',
    path: '/internal/ml/modules/setup/sample_data_weblogs',
    body: {
      prefix: 'test_',
      indexPatternName: sampleDataIndex,
      useDedicatedIndex: false,
      startDatafeed: true,
      start: timeRangeResponse.data.start,
      end: timeRangeResponse.data.end,
    },
    headers: { 'elastic-api-version': '1' },
  });
}
