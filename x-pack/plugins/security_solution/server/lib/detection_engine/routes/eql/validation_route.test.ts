/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { serverMock, requestContextMock } from '../__mocks__';
import { eqlValidationRequest, getEmptyEqlSearchResponse } from '../__mocks__/request_responses';
import { eqlValidationRoute } from './validation_route';

describe('validate_eql route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.newClusterClient.asCurrentUser.eql.search.mockResolvedValue(
      (getEmptyEqlSearchResponse() as unknown) as TransportRequestPromise<
        ApiResponse<unknown, unknown>
      >
    );
    eqlValidationRoute(server.router);
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      const response = await server.inject(eqlValidationRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const response = await server.inject(eqlValidationRequest(), context);
      const expectedBody = {
        valid: true,
        errors: [],
      };
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('returns 500 when bad response from cluster', async () => {
      clients.newClusterClient.asCurrentUser.eql.search.mockImplementation(() => {
        throw new Error('Test error');
      });
      const response = await server.inject(eqlValidationRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
    });
  });
});
