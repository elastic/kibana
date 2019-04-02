/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface AvailableTotal {
  available: boolean;
  total: number;
}
interface Status {
  completed: number;
  failed: number;
}

interface RangeStats {
  _all: number;
  csv: AvailableTotal;
  PNG: AvailableTotal;
  printable_pdf: {
    available: boolean;
    total: number;
    app: {
      visualization: number;
      dashboard: number;
    };
    layout: {
      print: number;
      preserve_layout: number;
    };
  };
  status: Status;
}

export interface UsageObject {
  available: boolean;
  enabled: boolean;
  browser_type: string;

  _all: number;
  csv: AvailableTotal;
  PNG: AvailableTotal;
  printable_pdf: {};
  status: Status;

  lastDay: RangeStats;
  last7Days: RangeStats;
}

export interface KeyCountBucket {
  key: string;
  doc_count: number;
}

export interface AggregationBuckets {
  buckets: KeyCountBucket[];
  pdf?: {
    buckets: KeyCountBucket[];
  };
}

export interface AggregationResults {
  [aggName: string]: AggregationBuckets | number;
  doc_count: number;
}

export interface JobTypes {
  [jobType: string]: {
    app?: any;
    layout?: any;
  };
}
