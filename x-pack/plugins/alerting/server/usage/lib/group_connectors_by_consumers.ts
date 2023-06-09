/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsBuckets } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { replaceDotSymbols } from './replace_dots_with_underscores';

export interface ConnectorsByConsumersBucket {
  key: string;
  actions: { connector_types: { buckets: Array<{ key: string; doc_count: number }> } };
}

export function groupConnectorsByConsumers(
  consumers: AggregationsBuckets<ConnectorsByConsumersBucket>
) {
  return (consumers as ConnectorsByConsumersBucket[]).reduce((acc, consumer) => {
    acc[consumer.key] = consumer.actions.connector_types.buckets.reduce((accBucket, bucket) => {
      accBucket[replaceDotSymbols(bucket.key)] = bucket.doc_count;
      return accBucket;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);
}
