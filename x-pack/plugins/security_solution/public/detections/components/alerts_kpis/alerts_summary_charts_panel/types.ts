/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

export interface SeverityBuckets {
  key: Severity;
  value: number;
  label: string;
}

export type ParsedAlertsData = SeverityBuckets[] | undefined | null;
export interface EntityFilter {
  field: string;
  value: string;
}

interface SeverityBucket {
  key: Severity;
  doc_count: number;
}

export interface AlertsBySeverityAgg {
  statusBySeverity: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: SeverityBucket[];
  };
}

export interface AlertsBySeverityResponse<Hit = {}, Aggregations = {} | undefined> {
  took: number;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}
