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
  typicalPayload,
  getFindResultStatus,
  getNonEmptyIndex,
  getEmptyIndex,
  getFindResultWithSingleHit,
  createMlRuleRequest,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRulesRoute } from './create_rules_route';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
jest.mock('../../rules/update_rules_notifications');

describe('create_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex()); // index exists
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.alertsClient.create.mockResolvedValue(getResult()); // creation succeeds
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // needed to transform

    createRulesRoute(server.router);
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
      const { siem, ...contextWithoutSiem } = context;
      const response = await server.inject(getCreateRequest(), contextWithoutSiem);
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

    it('rejects the request if licensing is not platinum', async () => {
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);

      const response = await server.inject(createMlRuleRequest(), context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'Your license does not support machine learning. Please upgrade your license.',
        status_code: 400,
      });
    });
  });

  describe('unhappy paths', () => {
    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const response = await server.inject(getCreateRequest(), context);

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'To create a rule, the index must exist first. Index .siem-signals does not exist',
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
          ...typicalPayload(),
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
          ...typicalPayload(),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'child "type" fails because ["type" must be one of [query, saved_query, machine_learning]]'
      );
    });
  });
});
