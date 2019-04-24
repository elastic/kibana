/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricAggregationCreators } from './metric_aggregation_creators';
import { InfraSnapshotRequestOptions } from './snapshot';

export const getGroupedNodesSources = (options: InfraSnapshotRequestOptions) => {
  const sources = options.groupBy.map(gb => {
    return { [`${gb.field}`]: { terms: { field: gb.field } } };
  });
  sources.push({
    node: { terms: { field: options.sourceConfiguration.fields[options.nodeType] } },
  });
  return sources;
};

export const getMetricsSources = (options: InfraSnapshotRequestOptions) => {
  return [{ node: { terms: { field: options.sourceConfiguration.fields[options.nodeType] } } }];
};

export const getMetricsAggregations = (options: InfraSnapshotRequestOptions) => {
  return metricAggregationCreators[options.metric.type](options.nodeType);
};
