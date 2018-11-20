/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { registerAutoFollowPatternRoutes } from './auto_follow_pattern';

jest.mock('../../lib/call_with_request_factory', () => ({ callWithRequestFactory: jest.fn() }));
jest.mock('../../lib/is_es_error_factory', () => ({ isEsErrorFactory: () => () => true }));
jest.mock('../../lib/license_pre_routing_factory', () => ({ licensePreRoutingFactory: () => null }));

/**
 * Hashtable to save the route handlers
 */
const routeHandlers = {};

/**
 * Helper to extract all the different server route handler so we can easily call them in our tests.
 *
 * Important: This method registers the handlers in the order that they appear in the file, so
 * if a "server.route()" call is moved or deleted, then the HANDLER_INDEX_TO_ACTION must be updated here.
 */
const registerHandlers = () => {
  let index = 0;

  const HANDLER_INDEX_TO_ACTION = {
    0: 'list'
  };

  const server = {
    route({ handler }) {
      // Save handler and increment index
      routeHandlers[HANDLER_INDEX_TO_ACTION[index]] = handler;
      index++;
    },
  };

  registerAutoFollowPatternRoutes(server);
};

/**
 * Helper to mock the response from the call to Elasticsearch
 *
 * @param {*} err The mock error to throw
 * @param {*} response The response to return
 */
const setHttpRequestResponse = (err, response) => {
  if (err) {
    return callWithRequestFactory.mockReturnValueOnce(() => {
      throw err;
    });
  }

  callWithRequestFactory.mockReturnValueOnce(() => response);
};

describe('[CCR API Routes] Auto Follow Pattern', () => {
  let routeHandler;

  beforeAll(() => {
    registerHandlers();
  });

  describe('list()', () => {
    beforeEach(() => {
      routeHandler = routeHandlers.list;
    });

    it('should forward the response from Elasticsearch', async () => {
      const mock = { foo: 'bar' };
      setHttpRequestResponse(null, mock);

      const response = await routeHandler();

      expect(response).toBe(mock);
    });

    it('should prevent a 404 response on the route', async () => {
      setHttpRequestResponse({ status: 404 });

      const response = await routeHandler();

      expect(response).toEqual({});
    });
  });
});
