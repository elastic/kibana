/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMetric, ApmMetricFields } from '../metrics';
import { createQuery } from '../create_query';

/**
 * {@code createQuery} for all APM instances.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createApmQuery(options: {
  filters?: any[];
  types?: string[];
  metric?: ApmMetricFields;
  uuid?: string;
  clusterUuid: string;
  start?: number;
  end?: number;
}) {
  const opts = {
    filters: [] as any[],
    metric: ApmMetric.getMetricFields(),
    type: 'beats_stats',
    metricset: 'stats',
    dsDataset: 'beats.stats',
    ...(options ?? {}),
  };

  opts.filters.push({
    bool: {
      must: {
        term: {
          'beats_stats.beat.type': 'apm-server',
        },
      },
    },
  });
  return createQuery(opts);
}
