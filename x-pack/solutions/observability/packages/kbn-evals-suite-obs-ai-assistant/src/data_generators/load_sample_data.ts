/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ScoutLogger } from '@kbn/scout';

export async function loadSampleData({
  log,
  kbnClient,
  sampleDataId,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
  sampleDataId: 'ecommerce' | 'flights' | 'logs';
}): Promise<string> {
  log.info('Loading sample data...');

  const sampleDataResponse = await kbnClient.request<{
    elasticsearchIndicesCreated: Record<string, number>;
    kibanaSavedObjectsLoaded: number;
  }>({ method: 'POST', path: `/api/sample_data/${sampleDataId}` });

  const sampleDataIndex = Object.keys(sampleDataResponse.data.elasticsearchIndicesCreated)[0];
  log.info(`Sample data index created: ${sampleDataIndex}`);
  return sampleDataIndex;
}
