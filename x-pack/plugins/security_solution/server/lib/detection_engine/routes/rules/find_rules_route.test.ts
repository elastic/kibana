/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getResult,
  getFindRequest,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { findRulesRoute } from './find_rules_route';

describe('find_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.alertsClient.get.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    findRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getFindRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getFindRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('catches error if search throws error', async () => {
      clients.alertsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getFindRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: `${DETECTION_ENGINE_RULES_URL}/_find`,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'timestamp',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: `${DETECTION_ENGINE_RULES_URL}/_find`,
        query: {
          invalid_value: 'hi mom',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('invalid keys "invalid_value"');
    });
  });
});
