/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation, Datafeed } from '../types/anomaly_detection_jobs';

export function getAggregations<T>(obj: any): T | undefined {
  if (obj?.aggregations !== undefined) return obj.aggregations;
  if (obj?.aggs !== undefined) return obj.aggs;
  return undefined;
}

export const getDatafeedAggregations = (
  datafeedConfig: Partial<Datafeed> | undefined
): Aggregation | undefined => {
  return getAggregations<Aggregation>(datafeedConfig);
};

export const getAggregationBucketsName = (aggregations: any): string | undefined => {
  if (typeof aggregations === 'object') {
    const keys = Object.keys(aggregations);
    return keys.length > 0 ? keys[0] : undefined;
  }
};
