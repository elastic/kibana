/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupRequest } from './setup_request';

describe('setupRequest', () => {
  let callWithRequestSpy: jest.Mock;
  let mockReq: any;

  beforeEach(() => {
    callWithRequestSpy = jest.fn();
    mockReq = {
      params: {},
      query: {},
      server: {
        config: () => 'myConfig',
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest: callWithRequestSpy
            })
          }
        }
      }
    };

    const setup = setupRequest(mockReq);
    setup.client('myType', { body: 'foo' });
  });

  it('should call callWithRequest with correct args', () => {
    expect(callWithRequestSpy).toHaveBeenCalledWith(mockReq, 'myType', {
      body: 'foo',
      rest_total_hits_as_int: true
    });
  });

  it('should update params with rest_total_hits_as_int', () => {
    expect(callWithRequestSpy.mock.calls[0][2]).toEqual({
      body: 'foo',
      rest_total_hits_as_int: true
    });
  });
});
