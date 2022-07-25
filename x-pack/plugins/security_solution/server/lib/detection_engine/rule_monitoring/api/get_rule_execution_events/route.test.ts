/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock, requestMock } from '../../../routes/__mocks__';

import {
  GET_RULE_EXECUTION_EVENTS_URL,
  LogLevel,
  RuleExecutionEventType,
} from '../../../../../../common/detection_engine/rule_monitoring';
import { getRuleExecutionEventsResponseMock } from '../../../../../../common/detection_engine/rule_monitoring/mocks';
import type { GetExecutionEventsArgs } from '../../logic/rule_execution_log';
import { getRuleExecutionEventsRoute } from './route';

describe('getRuleExecutionEventsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    getRuleExecutionEventsRoute(server.router);
  });

  const getRuleExecutionEventsRequest = () =>
    requestMock.create({
      method: 'get',
      path: GET_RULE_EXECUTION_EVENTS_URL,
      params: {
        ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      },
      query: {
        event_types: `${RuleExecutionEventType['status-change']}`,
        log_levels: `${LogLevel.debug},${LogLevel.info}`,
        page: 3,
      },
    });

  it('passes request arguments to rule execution log', async () => {
    const expectedArgs: GetExecutionEventsArgs = {
      ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      eventTypes: [RuleExecutionEventType['status-change']],
      logLevels: [LogLevel.debug, LogLevel.info],
      sortOrder: 'desc',
      page: 3,
      perPage: 20,
    };

    await server.inject(
      getRuleExecutionEventsRequest(),
      requestContextMock.convertContext(context)
    );

    expect(clients.ruleExecutionLog.getExecutionEvents).toHaveBeenCalledTimes(1);
    expect(clients.ruleExecutionLog.getExecutionEvents).toHaveBeenCalledWith(expectedArgs);
  });

  describe('when it finds events in rule execution log', () => {
    it('returns 200 response with the events', async () => {
      const events = getRuleExecutionEventsResponseMock.getSomeResponse();
      clients.ruleExecutionLog.getExecutionEvents.mockResolvedValue(events);

      const response = await server.inject(
        getRuleExecutionEventsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(events);
    });
  });

  describe('when rule execution log client throws an error', () => {
    it('returns 500 response with it', async () => {
      clients.ruleExecutionLog.getExecutionEvents.mockRejectedValue(new Error('Boom!'));

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
