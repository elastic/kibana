/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SeverityEnum {
  high = 'High',
  medium = 'Medium',
  low = 'Low',
}

export enum StatusEnum {
  open = 'Open',
  acknowledged = 'Acknowledged',
  closed = 'Closed',
}

export type StatusSequence = keyof typeof StatusEnum;
export type SeveritySequence = keyof typeof SeverityEnum;

export interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: SeverityBucket[];
}

export interface StatusBucket {
  key: StatusSequence;
  doc_count: number;
  statusBySeverity?: StatusBySeverity;
}

export interface ParsedStatusBucket extends StatusBucket {
  buckets: ParsedSeverityBucket[];
  link?: string | null;
  label: string;
}

export interface SeverityBucket {
  key: SeveritySequence;
  doc_count: number;
}

export interface ParsedSeverityBucket {
  value: number;
  status: string;
  label: string;
  group: StatusSequence;
  key: SeveritySequence;
}

export interface AlertsByStatusAgg {
  alertsByStatus: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: StatusBucket[];
  };
}

export interface AlertsResponse<Hit = {}, Aggregations = {} | undefined> {
  took: number;
  timed_out: boolean;
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
    max_score: number | null;
    hits: Hit[];
  };
}
