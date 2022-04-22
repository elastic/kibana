/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock } from '../__mocks__';
import {
  getRuleExecutionEventsRequest,
  getAggregateExecutionEvents,
} from '../__mocks__/request_responses';
import { getRuleExecutionEventsRoute } from './get_rule_execution_events_route';

// TODO: Add additional tests for param validation

describe('getRuleExecutionEventsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    getRuleExecutionEventsRoute(server.router);
  });

  describe('when it finds events in rule execution log', () => {
    it('returns 200 response with the events', async () => {
      const executionEvents = getAggregateExecutionEvents();
      clients.ruleExecutionLog.getAggregateExecutionEvents.mockResolvedValue(executionEvents);

      const response = await server.inject(
        getRuleExecutionEventsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(executionEvents);
    });
  });

  describe('when rule execution log client throws an error', () => {
    it('returns 500 response with it', async () => {
      clients.ruleExecutionLog.getAggregateExecutionEvents.mockRejectedValue(new Error('Boom!'));

      const response = await server.inject(
        getRuleExecutionEventsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Boom!',
        status_code: 500,
      });
    });
  });
});
