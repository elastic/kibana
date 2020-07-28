/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getFindResultStatus, ruleStatusRequest } from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { findRulesStatusesRoute } from './find_rules_status_route';

describe('find_statuses', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // successful status search

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
