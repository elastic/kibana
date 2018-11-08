/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { registerAutoFollowPatternRoutes } from './register_auto_follow_pattern_routes';

jest.mock('../../lib/call_with_request_factory', () => ({ callWithRequestFactory: jest.fn() }));
jest.mock('../../lib/is_es_error_factory', () => ({ isEsErrorFactory: () => () => true }));
jest.mock('../../lib/license_pre_routing_factory', () => ({ licensePreRoutingFactory: () => null }));

const setHttpRequestResponse = (err, response) => {
  if (err) {
    return callWithRequestFactory.mockReturnValueOnce(() => {
      throw err;
    });
  }

  callWithRequestFactory.mockReturnValueOnce(() => response);
};

describe('[API Routes] Auto Follow Pattern', () => {
  let server;
  let routeHandler;

  beforeEach(() => {
    server = {
      route({ handler }) {
        routeHandler = handler;
      },
    };
  });

  describe('list()', () => {
    it('should forward the response from Elasticsearch', async () => {
      const mock = { foo: 'bar' };
      setHttpRequestResponse(null, mock);

      registerAutoFollowPatternRoutes(server);
      const response = await routeHandler();

      expect(response).toBe(mock);
    });

    it('should prevent a 404 response on the route', async () => {
      setHttpRequestResponse({ status: 404 });

      registerAutoFollowPatternRoutes(server);
      const response = await routeHandler();

      expect(response).toEqual({});
    });
  });
});
