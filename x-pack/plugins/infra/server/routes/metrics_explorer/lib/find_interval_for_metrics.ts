/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import LRU from 'lru-cache';
import { MetricsExplorerRequestBody } from '../../../../common/http_api';
import { getDatasetForField } from './get_dataset_for_field';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';
import { ESSearchClient } from '../../../lib/metrics/types';

const cache = new LRU({
  max: 100,
  maxAge: 15 * 60 * 1000,
});

export const findIntervalForMetrics = async (
  client: ESSearchClient,
  options: MetricsExplorerRequestBody
) => {
  const fields = uniq(
    options.metrics.map((metric) => (metric.field ? metric.field : null)).filter((f) => f)
  ) as string[];

  const cacheKey = fields.sort().join(':');

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (fields.length === 0) {
    return 60;
  }

  const modules = await Promise.all(
    fields.map(
      async (field) =>
        await getDatasetForField(client, field as string, options.indexPattern, options.timerange)
    )
  );

  const interval = calculateMetricInterval(
    client,
    {
      indexPattern: options.indexPattern,
      timerange: options.timerange,
    },
    modules.filter(Boolean) as string[]
  );
  cache.set(cacheKey, interval);
  return interval;
};
