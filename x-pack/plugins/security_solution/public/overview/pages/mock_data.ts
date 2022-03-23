/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Status } from '../../../common/detection_engine/schemas/common';
import {
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_HIGH_LABEL,
} from '../../common/components/donut_chart/translations';
import {
  BucketResult,
  Severity,
  sortBucketWithGivenValue,
  StatusBucket,
  StatusBySeverity,
} from './utils';

const label = {
  low: STATUS_LOW_LABEL,
  medium: STATUS_MEDIUM_LABEL,
  high: STATUS_HIGH_LABEL,
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
        ] as StatusBucket[],
      },
    },
  };

  const statusSequence: Status[] = ['open', 'acknowledged', 'closed'];
  const severitySequence: Severity[] = ['high', 'medium', 'low'];

  const resp: BucketResult<StatusBucket> = sortBucketWithGivenValue(
    response.aggregations.alertsByStatus.buckets,
    statusSequence,
    'key'
  );
  resp.forEach((bucket, idx) => {
    const temp = sortBucketWithGivenValue(bucket.statusBySeverity.buckets, severitySequence, 'key');

    resp[idx].buckets = temp.reduce((acc, curr) => {
      return [
        ...acc,
        {
          ...acc,
          name: bucket.key,
          value: curr.doc_count,
          label: label[curr.key],
        },
      ];
    }, []);
  });
  return resp;
};
