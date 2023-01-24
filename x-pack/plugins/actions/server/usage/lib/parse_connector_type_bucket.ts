/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsBuckets } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { replaceFirstAndLastDotSymbols } from '../actions_telemetry';

export interface AvgActionRunOutcomeByConnectorTypeBucket {
  key: string;
  doc_count: number; // Not used for duration telemetry but can be helpful later.
  outcome: { count: { buckets: Array<{ key: string; doc_count: number }> } };
}

export function parseActionRunOutcomeByConnectorTypesBucket(
  connectorTypeBuckets: AggregationsBuckets<AvgActionRunOutcomeByConnectorTypeBucket> = []
) {
  const connectorTypes = connectorTypeBuckets as AvgActionRunOutcomeByConnectorTypeBucket[];
  return connectorTypes.reduce((acc, connectorType) => {
    const outcomes = connectorType.outcome?.count?.buckets ?? [];
    return {
      ...acc,
      [replaceFirstAndLastDotSymbols(connectorType.key)]: outcomes.reduce((accBucket, bucket) => {
        return { ...accBucket, [replaceFirstAndLastDotSymbols(bucket.key)]: bucket.doc_count || 0 };
      }, {}),
    };
  }, {});
}
