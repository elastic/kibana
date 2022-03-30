/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  resolveAlertMock,
  getDeleteRequest,
  getFindResultWithSingleHit,
  getDeleteRequestById,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { deleteRulesRoute } from './delete_rules_route';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

describe('delete_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse());

    deleteRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      const response = await server.inject(getDeleteRequest(), context);

      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      clients.rulesClient.resolve.mockResolvedValue(resolveAlertMock(getQueryRuleParams()));
      const response = await server.inject(getDeleteRequestById(), context);

      expect(response.status).toEqual(200);
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getDeleteRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if deletion throws error', async () => {
      clients.rulesClient.delete.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getDeleteRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('rejects a request with no id', async () => {
      const request = requestMock.create({
        method: 'delete',
        path: DETECTION_ENGINE_RULES_URL,
        query: {},
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });
  });
});
