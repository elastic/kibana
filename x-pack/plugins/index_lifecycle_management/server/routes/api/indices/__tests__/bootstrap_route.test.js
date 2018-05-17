/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerBootstrapRoute } from '../register_bootstrap_route';

jest.mock('../../../../lib/call_with_request_factory', () => {
  const mock = jest.fn();
  return {
    callWithRequestFactory: () => mock,
  };
});

jest.mock('../../../../lib/is_es_error_factory', () => ({
  isEsErrorFactory: jest.fn().mockImplementation(() => jest.fn()),
}));

jest.mock('../../../../lib/license_pre_routing_factory', () => ({
  licensePreRoutingFactory: jest.fn().mockImplementation(() => jest.fn()),
}));

let routeHandler;
const mockServer = {
  route: options => {
    routeHandler = options.handler;
  }
};

describe('ilmBootstrapRoute', () => {
  it('should call indices.create', async () => {
    registerBootstrapRoute(mockServer);

    await routeHandler({ payload: {
      indexName: 'myIndex',
      aliasName: 'myAlias',
    } }, jest.fn());

    const mock = require('../../../../lib/call_with_request_factory').callWithRequestFactory().mock;

    expect(mock.calls.length).toBe(1);
    expect(mock.calls[0]).toEqual([
      'indices.create',
      {
        index: 'myIndex',
        aliases: {
          myAlias: {}
        },
        settings: {
          'index.lifecycle.rollover_alias': 'myAlias'
        }
      }
    ]);
  });
});
