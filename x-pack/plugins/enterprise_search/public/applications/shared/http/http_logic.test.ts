/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetContext } from 'kea';

import { httpServiceMock } from '@kbn/core/public/mocks';

import { HttpLogic, HttpValues, mountHttpLogic } from './http_logic';

describe('HttpLogic', () => {
  const mockHttp = httpServiceMock.createSetupContract();
  const mount = (values: Partial<HttpValues> = {}) => mountHttpLogic({ http: mockHttp, ...values });

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  it('has the correct defaults', () => {
    mount();

    expect(HttpLogic.values).toEqual({
      http: mockHttp,
      httpInterceptors: expect.any(Array),
    });
  });

  describe('mounts', () => {
    it('sets values from props', () => {
      mountHttpLogic({
        http: mockHttp,
      });

      expect(HttpLogic.values).toEqual({
        http: mockHttp,
        httpInterceptors: expect.any(Array),
      });
    });
  });

  describe('http interceptors', () => {
    it('sets httpInterceptors and calls all valid remove functions on unmount', () => {
      const unmount = mount();
      const httpInterceptors = [jest.fn(), undefined, jest.fn()] as any;

      HttpLogic.actions.setHttpInterceptors(httpInterceptors);
      expect(HttpLogic.values.httpInterceptors).toEqual(httpInterceptors);

      unmount();
      expect(httpInterceptors[0]).toHaveBeenCalledTimes(1);
      expect(httpInterceptors[2]).toHaveBeenCalledTimes(1);
    });
  });
});
