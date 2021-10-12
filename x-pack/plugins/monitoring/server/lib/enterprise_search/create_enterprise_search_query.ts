/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchMetric, EnterpriseSearchMetricFields } from '../metrics';
import { createQuery } from '../create_query';

/**
 * {@code createQuery} for all APM instances.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createEnterpriseSearchQuery(options: {
  filters?: any[];
  types?: string[];
  metric?: EnterpriseSearchMetricFields;
  uuid?: string;
  clusterUuid: string;
  start?: number;
  end?: number;
}) {
  const opts = {
    filters: [] as any[],
    metric: EnterpriseSearchMetric.getMetricFields(),
    types: ['health', 'stats'],
    ...(options ?? {}),
  };

  opts.filters.push({
    bool: {
      should: [
        { term: { 'event.dataset': 'enterprisesearch.health' } },
        { term: { 'event.dataset': 'enterprisesearch.stats' } },
      ],
    },
  });

  return createQuery(opts);
}
