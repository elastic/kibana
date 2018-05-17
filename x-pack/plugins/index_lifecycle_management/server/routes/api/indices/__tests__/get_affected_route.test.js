/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerGetAffectedRoute } from '../register_get_affected_route';

jest.mock('../../../../lib/call_with_request_factory', () => {
  const mock = jest.fn().mockImplementation((method, params) => {
    // console.log('hi', method, params);
    if (params.path === '/_template') {
      return {
        'foobar': {
          index_patterns: ['foobar*']
        },
        'barfoo': {
          index_patterns: ['barfoo*'],
          settings: {
            index: {
              lifecycle: {
                name: 'myPolicy'
              }
            }
          }
        }
      };
    }
  });
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

const routeHandlers = [];
const mockServer = {
  route: options => {
    routeHandlers.push(options.handler);
  }
};

describe('ilmGetAffectedRoute', () => {
  it('should call indices.create', async () => {
    registerGetAffectedRoute(mockServer);


    for (const routeHandler of routeHandlers) {
      await routeHandler({ params: {
        indexTemplateName: 'foobar',
        policyName: 'myPolicy'
      } }, jest.fn());
    }

    const mock = require('../../../../lib/call_with_request_factory').callWithRequestFactory().mock;

    expect(mock.calls.length).toBe(4);
    expect(mock.calls[1]).toEqual([
      'indices.get',
      {
        index: ['foobar*']
      }
    ]);
    expect(mock.calls[3]).toEqual([
      'indices.get',
      {
        index: ['foobar*', 'barfoo*']
      }
    ]);
  });
});
