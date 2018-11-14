/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { registerDeleteRoute } from './register_delete_route';

jest.mock('../../../lib/call_with_request_factory', () => ({ callWithRequestFactory: jest.fn() }));
jest.mock('../../../lib/is_es_error_factory', () => ({ isEsErrorFactory: () => () => true }));
jest.mock('../../../lib/license_pre_routing_factory', () => ({ licensePreRoutingFactory: () => null }));

const setHttpRequestResponse = (err, response) => {
  if (err) {
    return callWithRequestFactory.mockReturnValueOnce(() => {
      throw err;
    });
  }

  callWithRequestFactory.mockReturnValueOnce(() => response);
};

describe('[API Routes] Remote Clusters Delete', () => {
  let server;
  let routeHandler;

  beforeEach(() => {
    server = {
      route({ handler }) {
        routeHandler = handler;
      },
    };
  });

  it('should forward the response from Elasticsearch', async () => {
    const mock = {
      "acknowledged": true,
      "persistent": {},
      "transient": {}
    };
    setHttpRequestResponse(null, mock);

    registerDeleteRoute(server);
    const response = await routeHandler({
      params: {
        name: 'test_cluster'
      }
    });

    expect(response).toBe(mock);
  });
});
