/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from '../../../metrics';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../../common/constants';
import { convertMetricNames } from '../../convert_metric_names';

/*
 * Create the DSL for date histogram aggregations based on an array of metric names
 * NOTE: Issue https://github.com/elastic/x-pack-kibana/issues/332 would be
 * addressed if chart data aggregations used a module like this
 *
 * @param {Array} listingMetrics: Array of metric names (See server/lib/metrics/metrics.js)
 * @param {Number} bucketSize: Bucket size in seconds for date histogram interval
 * @return {Object} Aggregation DSL
 */
export function getMetricAggs(listingMetrics) {
  let aggItems = {};

  listingMetrics.forEach((metricName) => {
    const metric = metrics[metricName];
    let metricAgg = null;

    if (!metric) {
      return;
    }

    if (!metric.aggs) {
      // if metric does not have custom agg defined
      metricAgg = {
        metric: {
          [metric.metricAgg]: {
            // max, sum, etc
            field: metric.field,
          },
        },
        metric_deriv: {
          derivative: {
            buckets_path: 'metric',
            unit: NORMALIZED_DERIVATIVE_UNIT,
          },
        },
      };
    }

    aggItems = {
      ...aggItems,
      ...convertMetricNames(metricName, metric.aggs || metricAgg),
    };
  });

  return aggItems;
}
