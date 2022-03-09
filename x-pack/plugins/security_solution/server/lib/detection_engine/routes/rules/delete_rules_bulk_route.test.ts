/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getDeleteBulkRequest,
  getDeleteBulkRequestById,
  getDeleteAsPostBulkRequest,
  getDeleteAsPostBulkRequestById,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { deleteRulesBulkRoute } from './delete_rules_bulk_route';

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('delete_rules - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled)); // rule exists
    clients.rulesClient.delete.mockResolvedValue({}); // successful deletion
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // rule status request

    deleteRulesBulkRoute(server.router, isRuleRegistryEnabled);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('resturns 200 when deleting a single rule and related rule status', async () => {
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      const response = await server.inject(getDeleteBulkRequestById(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequestById(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 because the error is in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ])
      );
    });
  });

  describe('request validation', () => {
    test('rejects requests without IDs', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
        body: [{}],
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: { message: 'either "id" or "rule_id" must be set', status_code: 400 },
          rule_id: '(unknown id)',
        },
      ]);
    });

    test('rejects requests with both id and rule_id', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
        body: [{ id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f', rule_id: 'rule_1' }],
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message: 'both "id" and "rule_id" cannot exist, choose one or the other',
            status_code: 400,
          },
          rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f',
        },
      ]);
    });
  });
});
