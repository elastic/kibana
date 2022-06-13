/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadExecutionLogAggregations, SortField } from './load_execution_log_aggregations';

const http = httpServiceMock.createStartContract();

const mockResponse = {
  data: [
    {
      duration_ms: 50,
      es_search_duration_ms: 1,
      id: '13af2138-1c9d-4d34-95c1-c25fbfbb8eeb',
      message: "rule executed: .index-threshold:c8f2ccb0-aac4-11ec-a5ae-2101bb96406d: 'test'",
      num_active_alerts: 0,
      num_errored_actions: 0,
      num_new_alerts: 0,
      num_recovered_alerts: 0,
      num_succeeded_actions: 0,
      num_triggered_actions: 0,
      schedule_delay_ms: 1623,
      status: 'success',
      timed_out: false,
      timestamp: '2022-03-23T16:17:53.482Z',
      total_search_duration_ms: 4,
    },
  ],
  total: 5,
};

describe('loadExecutionLogAggregations', () => {
  test('should call load execution log aggregation API', async () => {
    http.get.mockResolvedValueOnce(mockResponse);

    const sortTimestamp = {
      timestamp: {
        order: 'asc',
      },
    } as SortField;

    const result = await loadExecutionLogAggregations({
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      filter: ['success', 'unknown'],
      perPage: 10,
      page: 0,
      sort: [sortTimestamp],
      http,
    });

    expect(result).toEqual({
      ...mockResponse,
      data: [
        {
          execution_duration: 50,
          es_search_duration: 1,
          id: '13af2138-1c9d-4d34-95c1-c25fbfbb8eeb',
          message: "rule executed: .index-threshold:c8f2ccb0-aac4-11ec-a5ae-2101bb96406d: 'test'",
          num_active_alerts: 0,
          num_errored_actions: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_succeeded_actions: 0,
          num_triggered_actions: 0,
          schedule_delay: 1623,
          status: 'success',
          timed_out: false,
          timestamp: '2022-03-23T16:17:53.482Z',
          total_search_duration: 4,
        },
      ],
    });

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rule/test-id/_execution_log",
        Object {
          "query": Object {
            "date_end": "2022-03-23T16:17:53.482Z",
            "date_start": "2022-03-23T16:17:53.482Z",
            "filter": "success OR unknown",
            "page": 1,
            "per_page": 10,
            "sort": "[{\\"timestamp\\":{\\"order\\":\\"asc\\"}}]",
          },
        },
      ]
    `);
  });
});
