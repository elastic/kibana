/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: SeverityBucket[];
}

interface StatusBucket {
  key: Status;
  doc_count: number;
  statusBySeverity?: StatusBySeverity;
}

interface SeverityBucket {
  key: Severity;
  doc_count: number;
}

export interface AlertsByStatusAgg {
  alertsByStatus: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: StatusBucket[];
  };
}

export interface AlertsByStatusResponse<Hit = {}, Aggregations = {} | undefined> {
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

export interface SeverityBuckets {
  key: Severity;
  value: number;
}
export type ParsedAlertsData = Partial<
  Record<Status, { total: number; severities: SeverityBuckets[] }>
>;
