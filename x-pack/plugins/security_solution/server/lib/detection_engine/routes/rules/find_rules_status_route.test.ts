/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getFindResultStatus, ruleStatusRequest, getResult } from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { findRulesStatusesRoute } from './find_rules_status_route';
import { RuleStatusResponse } from '../../rules/types';
import { AlertExecutionStatusErrorReasons } from '../../../../../../alerts/common';

jest.mock('../../signals/rule_status_service');

describe('find_statuses', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // successful status search
    clients.alertsClient.get.mockResolvedValue(getResult());
    findRulesStatusesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule status with a valid alertsClient', async () => {
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('catch error when status search throws error', async () => {
      clients.savedObjectsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('returns success if rule status client writes an error status', async () => {
      // 0. task manager tried to run the rule but couldn't, so the alerting framework
      // wrote an error to the executionStatus.
      const failingExecutionRule = getResult();
      failingExecutionRule.executionStatus = {
        status: 'error',
        lastExecutionDate: failingExecutionRule.executionStatus.lastExecutionDate,
        error: {
          reason: AlertExecutionStatusErrorReasons.Read,
          message: 'oops',
        },
      };

      // 1. getFailingRules api found a rule where the executionStatus was 'error'
      clients.alertsClient.get.mockResolvedValue({
        ...failingExecutionRule,
      });

      const response = await server.inject(ruleStatusRequest(), context);
      const body: RuleStatusResponse = response.body;
      expect(response.status).toEqual(200);
      expect(body[ruleStatusRequest().body.ids[0]].current_status?.status).toEqual('failed');
      expect(body[ruleStatusRequest().body.ids[0]].current_status?.last_failure_message).toEqual(
        'Reason: read Message: oops'
      );
    });
  });

  describe('request validation', () => {
    test('disallows singular id query param', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
        body: { id: ['someId'] },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('Invalid value "undefined" supplied to "ids"');
    });
  });
});
