/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation, Datafeed } from '../types/anomaly_detection_jobs';

export const getDatafeedAggregations = (
  datafeedConfig: Partial<Datafeed> | undefined
): Aggregation | undefined => {
  if (datafeedConfig?.aggregations !== undefined) return datafeedConfig.aggregations;
  if (datafeedConfig?.aggs !== undefined) return datafeedConfig.aggs;
  return undefined;
};

export const getAggregationBucketsName = (aggregations: any): string | undefined => {
  if (typeof aggregations === 'object') {
    const keys = Object.keys(aggregations);
    return keys.length > 0 ? keys[0] : undefined;
  }
};
