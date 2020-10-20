/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DnsHistogramSubBucket {
  key: string;
  doc_count: number;
  orderAgg: {
    value: number;
  };
}
interface DnsHistogramBucket {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: DnsHistogramSubBucket[];
}

export interface DnsHistogramGroupData {
  key: number;
  doc_count: number;
  key_as_string: string;
  histogram: DnsHistogramBucket;
}
