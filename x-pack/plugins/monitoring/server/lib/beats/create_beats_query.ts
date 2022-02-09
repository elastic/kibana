/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BeatsMetric, BeatsMetricFields } from '../metrics';
import { createQuery } from '../create_query';

/**
 * {@code createQuery} for all Beats instances.
 *
 * This helps to future proof Beats Monitoring by explicitly excluding APM Server from the Beats monitoring metrics
 * so that its stats do not propagate there and the forthcoming APM Server monitoring pages.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createBeatsQuery(options: {
  filters?: any[];
  types?: string[];
  metric?: BeatsMetricFields;
  uuid?: string;
  clusterUuid: string;
  start?: number;
  end?: number;
}) {
  const opts = {
    moduleType: 'beats',
    filters: [] as any[],
    metric: BeatsMetric.getMetricFields(),
    type: 'beats_stats',
    metricset: 'stats',
    dsDataset: 'beats.stats',
    ...(options ?? {}),
  };

  // avoid showing APM Server stats alongside other Beats because APM Server will have its own UI
  opts.filters.push({
    bool: {
      must_not: {
        term: {
          'beats_stats.beat.type': 'apm-server',
        },
      },
    },
  });

  return createQuery(opts);
}
