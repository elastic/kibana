/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { registerListRoute } from './register_list_route';

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

describe('[API Routes] Remote Clusters List', () => {
  let server;
  let routeHandler;

  beforeEach(() => {
    server = {
      route({ handler }) {
        routeHandler = handler;
      },
    };
  });

  it('should convert Elasticsearch response object to array', async () => {
    const mock = {
      abc: { seeds: ['xyz'] },
      foo: { seeds: ['bar'] },
    };
    setHttpRequestResponse(null, mock);

    registerListRoute(server);
    const response = await routeHandler();

    expect(response).toEqual([
      { name: 'abc', seeds: ['xyz'], isConfiguredByNode: true },
      { name: 'foo', seeds: ['bar'], isConfiguredByNode: true }
    ]);
  });

  it('should return empty array for empty Elasticsearch response', async () => {
    const mock = { };
    setHttpRequestResponse(null, mock);

    registerListRoute(server);
    const response = await routeHandler();

    expect(response).toEqual([]);
  });
});
