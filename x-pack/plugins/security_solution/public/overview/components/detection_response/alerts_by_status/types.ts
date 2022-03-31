/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

export interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: SeverityBucket[];
}

export interface StatusBucket {
  key: Status;
  doc_count: number;
  statusBySeverity?: StatusBySeverity;
}

export interface ParsedStatusBucket extends StatusBucket {
  buckets: ParsedSeverityBucket[];
  link?: string | null;
  label: string;
}

export interface SeverityBucket {
  key: Severity;
  doc_count: number;
}

export interface ParsedSeverityBucket {
  value: number;
  status: string;
  label: string;
  group: Status;
  key: Severity;
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
