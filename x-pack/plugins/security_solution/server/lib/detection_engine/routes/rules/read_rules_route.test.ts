/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

describe('read_signals', () => {
  let ruleDataClientMock = createRuleDataClientMock();
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // successful transform
    clients.ruleExecutionLogClient.find.mockResolvedValue([]);
    ruleDataClientMock = createRuleDataClientMock();
  });

  describe('status codes with actionClient and alertClient', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 200 when reading a single rule with a valid actionClient and alertClient - %s',
      async (_, ruleDataClient) => {
        clients.rulesClient.find.mockResolvedValue(
          getFindResultWithSingleHit(ruleDataClient != null)
        ); // rule exists
        readRulesRoute(server.router, ruleDataClient);
        const response = await server.inject(getReadRequest(), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 404 if alertClient is not available on the route - %s',
      async (_, ruleDataClient) => {
        clients.rulesClient.find.mockResolvedValue(
          getFindResultWithSingleHit(ruleDataClient != null)
        ); // rule exists
        readRulesRoute(server.router, ruleDataClient);
        context.alerting!.getRulesClient = jest.fn();
        const response = await server.inject(getReadRequest(), context);
        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns error if requesting a non-rule - %s', async (_, ruleDataClient) => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithSingleHit(ruleDataClient != null)
      ); // rule exists
      readRulesRoute(server.router, ruleDataClient);
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(ruleDataClient != null));
      const response = await server.inject(getReadRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('catches error if search throws error -%s', async (_, ruleDataClient) => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithSingleHit(ruleDataClient != null)
      ); // rule exists
      readRulesRoute(server.router, ruleDataClient);
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
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns 404 if given a non-existent id - %s', async (_, ruleDataClient) => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithSingleHit(ruleDataClient != null)
      ); // rule exists
      readRulesRoute(server.router, ruleDataClient);
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
