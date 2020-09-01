/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { httpServiceMock } from 'src/core/public/mocks';

import { HttpLogic } from './http_logic';

describe('HttpLogic', () => {
  const mockHttp = httpServiceMock.createSetupContract();
  const DEFAULT_VALUES = {
    http: null,
    httpInterceptors: [],
    errorConnecting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  it('has expected default values', () => {
    HttpLogic.mount();
    expect(HttpLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('initializeHttp()', () => {
    it('sets values based on passed props', () => {
      HttpLogic.mount();
      HttpLogic.actions.initializeHttp({ http: mockHttp, errorConnecting: true });

      expect(HttpLogic.values).toEqual({
        http: mockHttp,
        httpInterceptors: [],
        errorConnecting: true,
      });
    });
  });

  describe('setErrorConnecting()', () => {
    it('sets errorConnecting value', () => {
      HttpLogic.mount();
      HttpLogic.actions.setErrorConnecting(true);
      expect(HttpLogic.values.errorConnecting).toEqual(true);

      HttpLogic.actions.setErrorConnecting(false);
      expect(HttpLogic.values.errorConnecting).toEqual(false);
    });
  });

  describe('http interceptors', () => {
    describe('initializeHttpInterceptors()', () => {
      beforeEach(() => {
        HttpLogic.mount();
        jest.spyOn(HttpLogic.actions, 'setHttpInterceptors');
        jest.spyOn(HttpLogic.actions, 'setErrorConnecting');
        HttpLogic.actions.initializeHttp({ http: mockHttp });

        HttpLogic.actions.initializeHttpInterceptors();
      });

      it('calls http.intercept and sets an array of interceptors', () => {
        mockHttp.intercept.mockImplementationOnce(() => 'removeInterceptorFn' as any);
        HttpLogic.actions.initializeHttpInterceptors();

        expect(mockHttp.intercept).toHaveBeenCalled();
        expect(HttpLogic.actions.setHttpInterceptors).toHaveBeenCalledWith(['removeInterceptorFn']);
      });

      describe('errorConnectingInterceptor', () => {
        it('handles errors connecting to Enterprise Search', async () => {
          const { responseError } = mockHttp.intercept.mock.calls[0][0] as any;
          await responseError({ response: { url: '/api/app_search/engines', status: 502 } });

          expect(HttpLogic.actions.setErrorConnecting).toHaveBeenCalled();
        });

        it('does not handle non-502 Enterprise Search errors', async () => {
          const { responseError } = mockHttp.intercept.mock.calls[0][0] as any;
          await responseError({ response: { url: '/api/workplace_search/overview', status: 404 } });

          expect(HttpLogic.actions.setErrorConnecting).not.toHaveBeenCalled();
        });

        it('does not handle errors for unrelated calls', async () => {
          const { responseError } = mockHttp.intercept.mock.calls[0][0] as any;
          await responseError({ response: { url: '/api/some_other_plugin/', status: 502 } });

          expect(HttpLogic.actions.setErrorConnecting).not.toHaveBeenCalled();
        });
      });
    });

    it('sets httpInterceptors and calls all valid remove functions on unmount', () => {
      const unmount = HttpLogic.mount();
      const httpInterceptors = [jest.fn(), undefined, jest.fn()] as any;

      HttpLogic.actions.setHttpInterceptors(httpInterceptors);
      expect(HttpLogic.values.httpInterceptors).toEqual(httpInterceptors);

      unmount();
      expect(httpInterceptors[0]).toHaveBeenCalledTimes(1);
      expect(httpInterceptors[2]).toHaveBeenCalledTimes(1);
    });
  });
});
