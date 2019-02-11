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
            getCluster: () => ({ callWithRequest: callWithRequestSpy })
          }
        }
      },
      getUiSettingsService: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve(false))
      }))
    };
  });

  it('should call callWithRequest with correct args', async () => {
    const setup = setupRequest(mockReq);
    await setup.client('myType', { body: 'foo' });
    expect(callWithRequestSpy).toHaveBeenCalledWith(mockReq, 'myType', {
      body: 'foo',
      ignore_throttled: true,
      rest_total_hits_as_int: true
    });
  });

  it('should set ignore_throttled to false if includeFrozen is true', async () => {
    // mock includeFrozen to return true
    mockReq.getUiSettingsService.mockImplementation(() => ({
      get: jest.fn(() => Promise.resolve(true))
    }));
    const setup = setupRequest(mockReq);
    await setup.client('myType', { body: 'foo' });
    expect(callWithRequestSpy).toHaveBeenCalledWith(mockReq, 'myType', {
      body: 'foo',
      ignore_throttled: false,
      rest_total_hits_as_int: true
    });
  });
});
