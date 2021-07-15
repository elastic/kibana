/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchResponse } from '../../../common/types/es';
import type { Aggregation } from '../../types';

export type BucketCount<T> = Array<
  T & {
    count: number;
  }
>;

export interface BeatsElasticsearchResponse extends ElasticsearchResponse {
  aggregations?: {
    types?: Aggregation;
    active_counts?: Aggregation;
    versions?: Aggregation;
    total: {
      value: number;
    };
    max_events_total: {
      value: number;
    };
    min_events_total: {
      value: number;
    };
    max_bytes_sent_total: {
      value: number;
    };
    min_bytes_sent_total: {
      value: number;
    };
  };
}
