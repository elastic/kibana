/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Status } from '../../../common/detection_engine/schemas/common';

interface StatusBySeverityBucket {
  key: 'high' | 'medium' | 'low';
  doc_count: number;
}
interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: StatusBySeverityBucket[];
}
interface AlertsByStatusBucket {
  key: Status;
  doc_count: number;
  statusBySeverity: StatusBySeverity;
}

export const alertsData = () => {
  const response = {
    took: 4,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 10000,
        relation: 'gte',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      alertsByStatus: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'open',
            doc_count: 28149,
            statusBySeverity: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'low',
                  doc_count: 22717,
                },
                {
                  key: 'high',
                  doc_count: 5027,
                },
                {
                  key: 'medium',
                  doc_count: 405,
                },
              ],
            },
          },
          {
            key: 'closed',
            doc_count: 4,
            statusBySeverity: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'high',
                  doc_count: 4,
                },
                {
                  key: 'medium',
                  doc_count: 0,
                },
                {
                  key: 'low',
                  doc_count: 0,
                },
              ],
            },
          },
          {
            key: 'acknowledged',
            doc_count: 2,
            statusBySeverity: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'high',
                  doc_count: 2,
                },
                {
                  key: 'medium',
                  doc_count: 0,
                },
                {
                  key: 'low',
                  doc_count: 0,
                },
              ],
            },
          },
        ],
      },
    },
  };

  const sequence: Status[] = ['open', 'acknowledged', 'closed'];
  const resp: AlertsByStatusBucket[] = [];
  response.aggregations.alertsByStatus.buckets.forEach((bucket, idx) => {
    const key = sequence.indexOf(bucket.key as Status);
    if (key >= 0) {
      resp[key] = bucket;
    }
  });

  return resp;
};
