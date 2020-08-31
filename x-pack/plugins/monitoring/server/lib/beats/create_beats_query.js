/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash';
import { BeatsMetric } from '../metrics';
import { createQuery } from '../create_query';

/**
 * {@code createQuery} for all Beats instances.
 *
 * This helps to future proof Beats Monitoring by explicitly excluding APM Server from the Beats monitoring metrics
 * so that its stats do not propagate there and the forthcoming APM Server monitoring pages.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createBeatsQuery(options = {}) {
  options = defaults(options, {
    filters: [],
    metric: BeatsMetric.getMetricFields(),
    type: 'beats_stats',
  });

  // avoid showing APM Server stats alongside other Beats because APM Server will have its own UI
  options.filters.push({
    bool: {
      must_not: {
        term: {
          'beats_stats.beat.type': 'apm-server',
        },
      },
    },
  });

  return createQuery(options);
}
