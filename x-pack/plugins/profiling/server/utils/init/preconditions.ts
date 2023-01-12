/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export async function hasProfilingData(client: ElasticsearchClient): Promise<boolean> {
  return await client
    .search({
      index: 'profiling-events-all',
      size: 0,
      track_total_hits: true,
    })
    .then((response) => response.hits.total > 0)
    .catch((error) => {
      return false;
    });
}

export async function hasProfilingSetupCompleted(client: ElasticsearchClient): Promise<any[]> {
  const subSampledIndicesIdx = Array.from(Array(11).keys(), (item: number) => item + 1);
  const subSampledIndexName = (pow: number): string => {
    return `profiling-events-5pow${String(pow).padStart(2, '0')}`;
  };
  // Generate all the possible index template names
  const eventsIndices = ['profiling-events-all'].concat(
    subSampledIndicesIdx.map((pow) => subSampledIndexName(pow))
  );
  return Promise.all(
    // TODO maybe also add a check that the Fleet policy is in place?
    eventsIndices.map((name) => {
      return client.indices.getIndexTemplate({ name });
    })
  );
}
