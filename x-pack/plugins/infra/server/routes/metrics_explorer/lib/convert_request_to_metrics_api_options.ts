/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, isArray } from 'lodash';
import {
  MetricsAPIRequest,
  MetricsExplorerRequestBody,
  afterKeyObjectRT,
} from '../../../../common/http_api';
import { convertMetricToMetricsAPIMetric } from './convert_metric_to_metrics_api_metric';

export const convertRequestToMetricsAPIOptions = (
  options: MetricsExplorerRequestBody
): MetricsAPIRequest => {
  const metrics = options.metrics.map(convertMetricToMetricsAPIMetric);
  const { limit, timerange, indexPattern } = options;

  const metricsApiOptions: MetricsAPIRequest = {
    timerange,
    indexPattern,
    limit,
    metrics,
    dropLastBucket: true,
  };

  if (options.afterKey) {
    metricsApiOptions.afterKey = afterKeyObjectRT.is(options.afterKey)
      ? options.afterKey
      : { groupBy0: options.afterKey };
  }

  if (options.groupBy) {
    metricsApiOptions.groupBy = isArray(options.groupBy) ? options.groupBy : [options.groupBy];
  }

  if (options.filterQuery) {
    try {
      const filterObject = JSON.parse(options.filterQuery);
      if (isObject(filterObject)) {
        metricsApiOptions.filters = [filterObject];
      }
    } catch (err) {
      metricsApiOptions.filters = [
        {
          query_string: {
            query: options.filterQuery,
            analyze_wildcard: true,
          },
        },
      ];
    }
  }

  return metricsApiOptions;
};
