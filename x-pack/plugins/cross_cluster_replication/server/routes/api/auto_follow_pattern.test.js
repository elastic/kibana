/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { registerAutoFollowPatternRoutes } from './auto_follow_pattern';
import { getAutoFollowPatternMock, getAutoFollowPatternListMock } from '../../../fixtures/autofollow_pattern';
import { deserializeAutofollowPattern } from '../../lib/autofollow_pattern_serialization';

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
    0: 'list',
    1: 'create'
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

    it('should deSerialize the response from Elasticsearch', async () => {
      const totalResult = 2;
      const deSerializedKeys = Object.keys(deserializeAutofollowPattern('random', getAutoFollowPatternMock()));
      setHttpRequestResponse(null, getAutoFollowPatternListMock(totalResult));

      const response = await routeHandler();
      const autoFollowPattern = Object.values(response)[0];

      expect(Object.keys(response).length).toEqual(totalResult);
      expect(Object.keys(autoFollowPattern)).toEqual(deSerializedKeys);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      routeHandler = routeHandlers.create;
    });

    it('should serialize the payload before sending it to Elasticsearch', async () => {
      callWithRequestFactory.mockReturnValueOnce((_, payload = {}) => {
        if (payload.body.remote_cluster !== 'bar') {
          return `Error: body (${JSON.stringify(payload)})`;
        }
        return 'OK';
      });

      const request = {
        params: { id: 'foo' },
        payload: { remoteCluster: 'bar' }
      };

      const response = await routeHandler(request);
      expect(response).toEqual('OK');
    });
  });
});
