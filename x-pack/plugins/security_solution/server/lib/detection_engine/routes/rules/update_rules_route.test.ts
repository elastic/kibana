/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getResult,
  getUpdateRequest,
  getFindResultWithSingleHit,
  getFindResultStatusEmpty,
  nonRuleFindResult,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { updateRulesRoute } from './update_rules_route';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_rules_schema.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());
jest.mock('../../rules/update_rules_notifications');

describe('update_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.create();

    clients.alertsClient.get.mockResolvedValue(getResult()); // existing rule
    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.update.mockResolvedValue(getResult()); // successful update
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatusEmpty()); // successful transform

    updateRulesRoute(server.router, ml);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      (updateRulesNotifications as jest.Mock).mockResolvedValue({
        id: 'id',
        actions: [],
        alertThrottle: null,
        ruleThrottle: 'no_actions',
      });
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(getUpdateRequest(), contextWithoutSecuritySolution);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('returns error when updating non-rule', async () => {
      clients.alertsClient.find.mockResolvedValue(nonRuleFindResult());
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.alertsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    it('returns a 403 if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(),
      });

      const response = await server.inject(request, context);
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          rule_id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, context);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getCreateRulesSchemaMock(), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getCreateRulesSchemaMock(), type: 'unknown type' },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "unknown type" supplied to "type"'
      );
    });
  });
});
