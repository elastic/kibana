/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_HIGH_LABEL,
} from '../components/alerts_by_status/translations';
import { BucketResult, sortBucketWithGivenValue, StatusBucket } from './utils';

const label = {
  Low: STATUS_LOW_LABEL,
  Medium: STATUS_MEDIUM_LABEL,
  High: STATUS_HIGH_LABEL,
};

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
                  key: 'low',
                  doc_count: 0,
                },
              ],
            },
          },
          // {
          //   key: 'acknowledged',
          //   doc_count: 2,
          //   statusBySeverity: {
          //     doc_count_error_upper_bound: 0,
          //     sum_other_doc_count: 0,
          //     buckets: [
          //       {
          //         key: 'high',
          //         doc_count: 2,
          //       },
          //     ],
          //   },
          // },
        ] as StatusBucket[],
      },
    },
  };

  const statusSequence = ['Open', 'Acknowledged', 'Closed'];
  const severitySequence = ['High', 'Medium', 'Low'];

  const statusBuckets: Array<BucketResult<StatusBucket>> = sortBucketWithGivenValue(
    response.aggregations.alertsByStatus?.buckets ?? [],
    statusSequence,
    'key'
  );
  statusBuckets.forEach((statusBucket, idx) => {
    const severityBuckets = sortBucketWithGivenValue(
      statusBucket?.statusBySeverity?.buckets ?? [],
      severitySequence,
      'key'
    );

    statusBuckets[idx].buckets = severityBuckets.reduce((acc, severityBucket) => {
      return [
        ...acc,
        {
          ...acc,
          name: statusBucket.key,
          value: severityBucket.doc_count,
          label: label[severityBucket.key],
        },
      ];
    }, []);
  });
  return statusBuckets;
};
