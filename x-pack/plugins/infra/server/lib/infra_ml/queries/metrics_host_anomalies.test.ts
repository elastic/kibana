/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMetricsHostsAnomaliesQuery } from './metrics_hosts_anomalies';
import { Sort, Pagination } from '../../../../common/http_api/infra_ml';

describe('createMetricsHostAnomaliesQuery', () => {
  const jobIds = ['kibana-metrics-ui-default-default-hosts_memory_usage'];
  const anomalyThreshold = 30;
  const startTime = 1612454527112;
  const endTime = 1612541227112;
  const sort: Sort = { field: 'anomalyScore', direction: 'desc' };
  const pagination: Pagination = { pageSize: 101 };

  test('returns the correct query', () => {
    expect(
      createMetricsHostsAnomaliesQuery({
        jobIds,
        anomalyThreshold,
        startTime,
        endTime,
        sort,
        pagination,
      })
    ).toMatchObject({
      allow_no_indices: true,
      ignore_unavailable: true,
      track_scores: false,
      track_total_hits: false,
      body: {
        query: {
          bool: {
            filter: [
              { terms: { job_id: ['kibana-metrics-ui-default-default-hosts_memory_usage'] } },
              { range: { record_score: { gte: 30 } } },
              { range: { timestamp: { gte: 1612454527112, lte: 1612541227112 } } },
              { terms: { result_type: ['record'] } },
            ],
          },
        },
        sort: [{ record_score: 'desc' }, { _doc: 'desc' }],
        size: 101,
        _source: [
          'job_id',
          'record_score',
          'typical',
          'actual',
          'partition_field_name',
          'partition_field_value',
          'timestamp',
          'bucket_span',
          'by_field_value',
          'host.name',
          'influencers.influencer_field_name',
          'influencers.influencer_field_values',
        ],
      },
    });
  });
});
