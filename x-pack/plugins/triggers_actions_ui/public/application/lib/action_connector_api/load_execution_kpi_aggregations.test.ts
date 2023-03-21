/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadGlobalConnectorExecutionKPIAggregations } from './load_execution_kpi_aggregations';

const http = httpServiceMock.createStartContract();

const mockResponse = {
  failure: 0,
  success: 1,
  unknown: 0,
  warning: 0,
};

describe('loadGlobalConnectorExecutionKPIAggregations', () => {
  test('should call load execution kpi aggregation API', async () => {
    http.post.mockResolvedValueOnce(mockResponse);

    const result = await loadGlobalConnectorExecutionKPIAggregations({
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      outcomeFilter: ['success', 'warning'],
      message: 'test-message',
      http,
    });

    expect(result).toEqual({
      ...mockResponse,
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/actions/_global_connector_execution_kpi",
        Object {
          "body": "{\\"filter\\":\\"(message: \\\\\\"test-message\\\\\\" OR error.message: \\\\\\"test-message\\\\\\") and (kibana.alerting.outcome:success OR (event.outcome: success AND NOT kibana.alerting.outcome:*) OR kibana.alerting.outcome: warning)\\",\\"date_start\\":\\"2022-03-23T16:17:53.482Z\\",\\"date_end\\":\\"2022-03-23T16:17:53.482Z\\"}",
        },
      ]
    `);
  });
});
