/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock } from '../__mocks__';
import { getRuleExecutionEventsRequest, getLastFailures } from '../__mocks__/request_responses';
import { getRuleExecutionEventsRoute } from './get_rule_execution_events_route';

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
describe('getRuleExecutionEventsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    getRuleExecutionEventsRoute(server.router);
  });

  describe('success', () => {
    it('returns 200 with found rule execution events', async () => {
      const lastFailures = getLastFailures();
      clients.ruleExecutionLogClient.getLastFailures.mockResolvedValue(lastFailures);

      const response = await server.inject(getRuleExecutionEventsRequest(), context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        events: lastFailures,
      });
    });
  });

  describe('errors', () => {
    it('returns 500 when rule execution log client throws an exception', async () => {
      clients.ruleExecutionLogClient.getLastFailures.mockImplementation(async () => {
        throw new Error('Test error');
      });

      const response = await server.inject(getRuleExecutionEventsRequest(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });
});
