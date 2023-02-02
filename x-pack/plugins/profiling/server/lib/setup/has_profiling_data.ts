/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export async function hasProfilingData(client: ElasticsearchClient): Promise<boolean> {
  const hasProfilingDataResponse = await client.search({
    index: 'profiling-events-all*',
    size: 0,
    track_total_hits: 1,
    terminate_after: 1,
  });

  const hitCount =
    typeof hasProfilingDataResponse.hits.total === 'number'
      ? hasProfilingDataResponse.hits.total
      : hasProfilingDataResponse.hits.total!.value > 0;

  return hitCount > 0;
}
