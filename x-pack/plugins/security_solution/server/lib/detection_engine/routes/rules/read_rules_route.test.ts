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
  getReadRequestWithId,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  getEmptySavedObjectsResponse,
  getRuleExecutionSummarySucceeded,
  resolveAlertMock,
} from '../__mocks__/request_responses';
import { requestMock, requestContextMock, serverMock } from '../__mocks__';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('read_rules - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const myFakeId = '99403909-ca9b-49ba-9d7a-7e5320e68d05';
  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled)); // rule exists
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // successful transform
    clients.ruleExecutionLog.getExecutionSummary.mockResolvedValue(
      getRuleExecutionSummarySucceeded()
    );

    clients.rulesClient.resolve.mockResolvedValue({
      ...resolveAlertMock(isRuleRegistryEnabled, {
        ...getQueryRuleParams(),
      }),
      id: myFakeId,
    });
    readRulesRoute(server.router, logger, isRuleRegistryEnabled);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when reading a single rule outcome === exactMatch', async () => {
      const response = await server.inject(getReadRequestWithId(myFakeId), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when reading a single rule outcome === aliasMatch', async () => {
      clients.rulesClient.resolve.mockResolvedValue({
        ...resolveAlertMock(isRuleRegistryEnabled, {
          ...getQueryRuleParams(),
        }),
        id: myFakeId,
        outcome: 'aliasMatch',
      });
      const response = await server.inject(getReadRequestWithId(myFakeId), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when reading a single rule outcome === conflict', async () => {
      clients.rulesClient.resolve.mockResolvedValue({
        ...resolveAlertMock(isRuleRegistryEnabled, {
          ...getQueryRuleParams(),
        }),
        id: myFakeId,
        outcome: 'conflict',
        alias_target_id: 'myaliastargetid',
      });
      const response = await server.inject(getReadRequestWithId(myFakeId), context);
      expect(response.status).toEqual(200);
      expect(response.body.alias_target_id).toEqual('myaliastargetid');
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
