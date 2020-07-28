/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  getResult,
  getCreateRequest,
  getFindResultStatus,
  getNonEmptyIndex,
  getEmptyIndex,
  getFindResultWithSingleHit,
  createMlRuleRequest,
} from '../__mocks__/request_responses';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRulesRoute } from './create_rules_route';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_rules_schema.mock';
jest.mock('../../rules/update_rules_notifications');
jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('create_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.create();

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex()); // index exists
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.alertsClient.create.mockResolvedValue(getResult()); // creation succeeds
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // needed to transform

    createRulesRoute(server.router, ml);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      (updateRulesNotifications as jest.Mock).mockResolvedValue({
        id: 'id',
        actions: [],
        alertThrottle: null,
        ruleThrottle: 'no_actions',
      });
      const response = await server.inject(getCreateRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getCreateRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(getCreateRequest(), contextWithoutSecuritySolution);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('returns 200 if license is not platinum', async () => {
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);

      const response = await server.inject(getCreateRequest(), context);
      expect(response.status).toEqual(200);
    });
  });

  describe('creating an ML Rule', () => {
    it('is successful', async () => {
      const response = await server.inject(createMlRuleRequest(), context);
      expect(response.status).toEqual(200);
    });

    it('returns a 403 if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(createMlRuleRequest(), context);
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('unhappy paths', () => {
    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const response = await server.inject(getCreateRequest(), context);

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'To create a rule, the index must exist first. Index undefined does not exist',
        status_code: 400,
      });
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(getCreateRequest(), context);

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: expect.stringContaining('already exists'),
        status_code: 409,
      });
    });

    test('catches error if creation throws', async () => {
      clients.alertsClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getCreateRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "unexpected_type" supplied to "type"'
      );
    });
  });
});
