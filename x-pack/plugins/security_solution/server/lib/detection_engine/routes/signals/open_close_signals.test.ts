/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import {
  getSetSignalStatusByIdsRequest,
  getSetSignalStatusByQueryRequest,
  typicalSetStatusSignalByIdsPayload,
  typicalSetStatusSignalByQueryPayload,
  setStatusSignalMissingIdsAndQueryPayload,
  getSuccessfulSignalUpdateResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setSignalsStatusRoute } from './open_close_signals_route';

describe('set signal status', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getSuccessfulSignalUpdateResponse());

    setSignalsStatusRoute(server.router);
  });

  describe('status on signal', () => {
    test('returns 200 when setting a status on a signal by ids', async () => {
      const response = await server.inject(getSetSignalStatusByIdsRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when setting a status on a signal by query', async () => {
      const response = await server.inject(getSetSignalStatusByQueryRequest(), context);
      expect(response.status).toEqual(200);
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        getSetSignalStatusByQueryRequest(),
        contextWithoutSecuritySolution
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('catches error if callAsCurrentUser throws error', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getSetSignalStatusByQueryRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows signal_ids and status', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows query and status', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body: typicalSetStatusSignalByQueryPayload(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects if neither signal_ids nor query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body: setStatusSignalMissingIdsAndQueryPayload(),
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['either "signal_ids" or "query" must be set'],
        status_code: 400,
      });
    });

    test('rejects if signal_ids but no status', async () => {
      const { status, ...body } = typicalSetStatusSignalByIdsPayload();
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "undefined" supplied to "status"'
      );
    });

    test('rejects if query but no status', async () => {
      const { status, ...body } = typicalSetStatusSignalByIdsPayload();
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "undefined" supplied to "status"'
      );
    });

    test('rejects if query and signal_ids but no status', async () => {
      const allTogether = {
        ...typicalSetStatusSignalByIdsPayload(),
        ...typicalSetStatusSignalByQueryPayload(),
      };
      const { status, ...body } = allTogether;
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "undefined" supplied to "status"'
      );
    });
  });
});
