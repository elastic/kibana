/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getTotalCountAggregations } from './get_total_count_aggregations';

const elasticsearch = elasticsearchServiceMock.createStart();
const mockLogger = loggingSystemMock.create().get();
describe('getTotalCountAggregations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return min/max connectors in use', async () => {
    elasticsearch.client.asInternalUser.search.mockResponseOnce({
      aggregations: {
        by_rule_type_id: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: '.index-threshold',
              doc_count: 2,
            },
            {
              key: 'logs.alert.document.count',
              doc_count: 1,
            },
            {
              key: 'document.test.',
              doc_count: 1,
            },
          ],
        },
        namespaces_count: { value: 2 },
        max_throttle_time: { value: 60 },
        min_throttle_time: { value: 0 },
        avg_throttle_time: { value: 30 },
        max_interval_time: { value: 10 },
        min_interval_time: { value: 1 },
        avg_interval_time: { value: 4.5 },
        max_actions_count: { value: 4 },
        min_actions_count: { value: 0 },
        avg_actions_count: { value: 2.5 },
      },
      // @ts-expect-error @elastic/elasticsearch
      hits: { total: { value: 4 } },
    });

    const telemetry = await getTotalCountAggregations({
      esClient: elasticsearch.client.asInternalUser,
      kibanaIndex: 'test',
      logger: mockLogger,
    });

    expect(elasticsearch.client.asInternalUser.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toEqual({
      connectors_per_alert: {
        avg: 2.5,
        max: 4,
        min: 0,
      },
      count_by_type: {
        '__index-threshold': 2,
        document__test__: 1,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        logs__alert__document__count: 1,
      },
      count_rules_namespaces: 2,
      count_total: 4,
      schedule_time: {
        avg: '4.5s',
        max: '10s',
        min: '1s',
      },
      schedule_time_number_s: {
        avg: 4.5,
        max: 10,
        min: 1,
      },
      throttle_time: {
        avg: '30s',
        max: '60s',
        min: '0s',
      },
      throttle_time_number_s: {
        avg: 30,
        max: 60,
        min: 0,
      },
    });
  });

  test('should return empty results if query throws error', async () => {
    elasticsearch.client.asInternalUser.search.mockRejectedValueOnce(new Error('oh no'));

    const telemetry = await getTotalCountAggregations({
      esClient: elasticsearch.client.asInternalUser,
      kibanaIndex: 'test',
      logger: mockLogger,
    });

    expect(elasticsearch.client.asInternalUser.search).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Error executing alerting telemetry task: getTotalCountAggregations - {}`
    );
    expect(telemetry).toEqual({
      connectors_per_alert: {
        avg: 0,
        max: 0,
        min: 0,
      },
      count_by_type: {},
      count_rules_namespaces: 0,
      count_total: 0,
      schedule_time: {
        avg: '0s',
        max: '0s',
        min: '0s',
      },
      schedule_time_number_s: {
        avg: 0,
        max: 0,
        min: 0,
      },
      throttle_time: {
        avg: '0s',
        max: '0s',
        min: '0s',
      },
      throttle_time_number_s: {
        avg: 0,
        max: 0,
        min: 0,
      },
    });
  });
});
