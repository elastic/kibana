/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getFindResultStatus,
  getFindResultWithSingleHit,
  ruleStatusRequest,
} from '../__mocks__/request_responses';
import {
  serverMock,
  requestContextMock,
  requestMock,
  ruleStatusServiceFactoryMock,
  ruleStatusSavedObjectsClientFactory,
  RuleStatusServiceMock,
} from '../__mocks__';
import { findRulesStatusesRoute } from './find_rules_status_route';
import { ruleStatusServiceFactory } from '../../signals/rule_status_service';
import { RuleStatusResponse } from '../../rules/types';

jest.mock('../../signals/rule_status_service');

describe('find_statuses', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let mockedRuleStatusServiceFactory: RuleStatusServiceMock | null | undefined;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    mockedRuleStatusServiceFactory = await ruleStatusServiceFactoryMock({
      alertId: 'fakeId',
      ruleStatusClient: ruleStatusSavedObjectsClientFactory(clients.savedObjectsClient),
    });
    (ruleStatusServiceFactory as jest.Mock).mockReturnValue(mockedRuleStatusServiceFactory);
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // successful status search
    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
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

    test('catches error if rule status client throws error', async () => {
      // rule status service throws an error when trying to write an error status
      mockedRuleStatusServiceFactory?.error.mockImplementationOnce(async () => {
        throw new Error('ruleStatusServiceFactory Test error');
      });
      const failingExecutionRule = getFindResultWithSingleHit();
      failingExecutionRule.data[0].executionStatus = {
        status: 'error',
        lastExecutionDate: failingExecutionRule.data[0].executionStatus.lastExecutionDate,
        error: {
          reason: 'read',
          message: 'oops',
        },
      };
      clients.alertsClient.find.mockResolvedValue({
        ...failingExecutionRule,
      });
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'ruleStatusServiceFactory Test error',
        status_code: 500,
      });
    });

    // ensures we are writing a failed status if the executionStatus of the rule
    // is in an error state.
    test('returns success if rule status client writes an error status', async () => {
      // 0. task manager tried to run the rule but couldn't, so the alerting framework
      // wrote an error to the executionStatus.
      const failingExecutionRule = getFindResultWithSingleHit();
      failingExecutionRule.data[0].executionStatus = {
        status: 'error',
        lastExecutionDate: failingExecutionRule.data[0].executionStatus.lastExecutionDate,
        error: {
          reason: 'read',
          message: 'oops',
        },
      };

      // 1. findRules api found a rule where the executionStatus was 'error'
      clients.alertsClient.find.mockResolvedValue({
        ...failingExecutionRule,
      });

      // 2. mocked ruleStatusService.error writes error status to the last-five-failures list

      // mock a 'failed' status to be resolved by the rulesStatusClient.find
      const foundStatusWithError = getFindResultStatus();
      foundStatusWithError.saved_objects[0].attributes.status = 'failed';

      // 3. represents ruleStatusClient.find
      clients.savedObjectsClient.find.mockResolvedValue(foundStatusWithError);

      const response = await server.inject(ruleStatusRequest(), context);
      const body: RuleStatusResponse = response.body;
      expect(response.status).toEqual(200);
      expect(body[ruleStatusRequest().body.ids[0]].current_status?.status).toEqual('failed');
      expect(mockedRuleStatusServiceFactory?.error).toHaveBeenCalledWith(
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
