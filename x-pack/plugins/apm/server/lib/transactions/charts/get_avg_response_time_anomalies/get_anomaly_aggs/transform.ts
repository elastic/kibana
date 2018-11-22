/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oc } from 'ts-optchain';
import { ESResponse } from './fetcher';

export interface AvgAnomalyBucket {
  anomalyScore: number | null;
  lower: number | null;
  upper: number | null;
}

export function anomalyAggsTransform(response: ESResponse) {
  if (!response) {
    return null;
  }

  const buckets = oc(response)
    .aggregations.ml_avg_response_times.buckets([])
    .map(bucket => {
      return {
        anomalyScore: bucket.anomaly_score.value,
        lower: bucket.lower.value,
        upper: bucket.upper.value
      };
    });

  return {
    buckets,
    bucketSize: oc(
      response
    ).aggregations.top_hits.hits.hits[0]._source.bucket_span(0)
  };
}
