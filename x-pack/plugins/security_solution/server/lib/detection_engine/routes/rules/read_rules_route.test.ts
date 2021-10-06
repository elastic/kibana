/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { readRulesRoute } from './read_rules_route';
import {
  getEmptyFindResult,
  getReadRequest,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { requestMock, requestContextMock, serverMock } from '../__mocks__';

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('read_rules - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled)); // rule exists
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // successful transform
    clients.ruleExecutionLogClient.find.mockResolvedValue([]);

    readRulesRoute(server.router, logger, isRuleRegistryEnabled);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when reading a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getRulesClient = jest.fn();
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('returns error if requesting a non-rule', async () => {
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(isRuleRegistryEnabled));
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('data validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL,
        query: { rule_id: 'DNE_RULE' },
      });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'rule_id: "DNE_RULE" not found', status_code: 404 });
    });
  });
});
