/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsBuckets } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { replaceDotSymbols } from './replace_dots_with_underscores';

export interface AvgActionRunDurationByConnectorTypeBucket {
  key: string;
  doc_count: number; // Not used for duration telemetry but can be helpful later.
  duration: { average: { value: number } };
}

export function parseDurationsByConnectorTypesBucket(
  connectorTypeBuckets: AggregationsBuckets<AvgActionRunDurationByConnectorTypeBucket> = []
) {
  const buckets = connectorTypeBuckets as AvgActionRunDurationByConnectorTypeBucket[];
  return buckets.reduce((acc, connectorType) => {
    return {
      ...acc,
      [replaceDotSymbols(connectorType.key)]: Math.round(
        connectorType.duration?.average?.value || 0
      ),
    };
  }, {});
}

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
      [replaceDotSymbols(connectorType.key)]: outcomes.reduce((accBucket, bucket) => {
        return { ...accBucket, [replaceDotSymbols(bucket.key)]: bucket.doc_count || 0 };
      }, {}),
    };
  }, {});
}
