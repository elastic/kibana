/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash';
import { InfraESSearchBody, InfraProcesorRequestOptions } from '../../adapter_types';
import { createBasePath } from '../../lib/create_base_path';
import { metricAggregationCreators } from '../../metric_aggregation_creators';

export const metricBucketsProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    const { metrics, groupBy } = options.nodeOptions;
    const path = createBasePath(groupBy).concat(['timeseries', 'aggs']);
    const aggs = metrics.reduce((acc, metric) => {
      const aggregationCreator = metricAggregationCreators[metric.type];
      const metricAgg = aggregationCreator(options.nodeType);
      if (!metricAgg) {
        return acc;
      }
      return {
        ...acc,
        ...metricAgg,
      };
    }, {});
    set(result, path, aggs);
    return result;
  };
};
