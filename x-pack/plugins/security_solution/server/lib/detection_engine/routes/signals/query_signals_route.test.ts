/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import {
  getSignalsQueryRequest,
  getSignalsAggsQueryRequest,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
  getSignalsAggsAndQueryRequest,
  getEmptySignalsResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { querySignalsRoute } from './query_signals_route';

describe('query for signal', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptySignalsResponse());

    querySignalsRoute(server.router);
  });

  describe('query and agg on signals index', () => {
    test('returns 200 when using single query', async () => {
      const response = await server.inject(getSignalsQueryRequest(), context);

      expect(response.status).toEqual(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQuery() })
      );
    });

    test('returns 200 when using single agg', async () => {
      const response = await server.inject(getSignalsAggsQueryRequest(), context);

      expect(response.status).toEqual(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQueryAggs() })
      );
    });

    test('returns 200 when using aggs and query together', async () => {
      const response = await server.inject(getSignalsAggsAndQueryRequest(), context);

      expect(response.status).toEqual(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          body: {
            ...typicalSignalsQuery(),
            ...typicalSignalsQueryAggs(),
          },
        })
      );
    });

    test('catches error if query throws error', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getSignalsAggsQueryRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows when query present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body: typicalSignalsQuery(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows when aggs present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body: typicalSignalsQueryAggs(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows when aggs and query present', async () => {
      const body = { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() };
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects when missing aggs and query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body: {},
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: '"value" must have at least 1 children',
        status_code: 400,
      });
    });
  });
});
