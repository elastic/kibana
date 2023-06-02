/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  loadGlobalConnectorExecutionLogAggregations,
  SortField,
} from './load_execution_log_aggregations';

const http = httpServiceMock.createStartContract();

const mockResponse = {
  data: [
    {
      connector_name: 'test connector',
      duration_ms: 1,
      id: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
      message: 'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
      schedule_delay_ms: 2783,
      space_ids: ['default'],
      status: 'success',
      timestamp: '2023-01-05T15:55:50.495Z',
      version: '8.7.0',
    },
  ],
  total: 1,
};

describe('loadGlobalConnectorExecutionLogAggregations', () => {
  test('should call load execution log aggregation API', async () => {
    http.post.mockResolvedValueOnce(mockResponse);

    const sortTimestamp = {
      timestamp: {
        order: 'asc',
      },
    } as SortField;

    const result = await loadGlobalConnectorExecutionLogAggregations({
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      outcomeFilter: ['success', 'warning'],
      message: 'test-message',
      perPage: 10,
      page: 0,
      sort: [sortTimestamp],
      http,
    });

    expect(result).toEqual({
      ...mockResponse,
      data: [
        {
          connector_name: 'test connector',
          execution_duration: 1,
          id: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
          message:
            'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
          schedule_delay: 2783,
          space_ids: ['default'],
          status: 'success',
          timestamp: '2023-01-05T15:55:50.495Z',
          version: '8.7.0',
        },
      ],
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/actions/_global_connector_execution_logs",
        Object {
          "body": "{\\"date_start\\":\\"2022-03-23T16:17:53.482Z\\",\\"date_end\\":\\"2022-03-23T16:17:53.482Z\\",\\"filter\\":\\"(message: \\\\\\"test-message\\\\\\" OR error.message: \\\\\\"test-message\\\\\\") and (kibana.alerting.outcome:success OR (event.outcome: success AND NOT kibana.alerting.outcome:*) OR kibana.alerting.outcome: warning)\\",\\"per_page\\":10,\\"page\\":1,\\"sort\\":\\"[{\\\\\\"timestamp\\\\\\":{\\\\\\"order\\\\\\":\\\\\\"asc\\\\\\"}}]\\"}",
        },
      ]
    `);
  });
});
