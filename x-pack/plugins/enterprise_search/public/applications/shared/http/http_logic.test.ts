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
      errorConnectingMessage: '',
      readOnlyMode: false,
    });
  });

  describe('mounts', () => {
    it('sets values from props', () => {
      mountHttpLogic({
        http: mockHttp,
        errorConnectingMessage: '502 Bad Gateway',
        readOnlyMode: true,
      });

      expect(HttpLogic.values).toEqual({
        http: mockHttp,
        httpInterceptors: expect.any(Array),
        errorConnectingMessage: '502 Bad Gateway',
        readOnlyMode: true,
      });
    });
  });

  describe('onConnectionError', () => {
    it('sets the error connecting flag and related message ', () => {
      mount({
        errorConnectingMessage: '',
      });

      HttpLogic.actions.onConnectionError('500 Error');
      expect(HttpLogic.values.errorConnectingMessage).toEqual('500 Error');
    });
  });

  describe('setReadOnlyMode()', () => {
    it('sets readOnlyMode value', () => {
      mount();
      expect(HttpLogic.values.readOnlyMode).toEqual(false);

      HttpLogic.actions.setReadOnlyMode(true);
      expect(HttpLogic.values.readOnlyMode).toEqual(true);

      HttpLogic.actions.setReadOnlyMode(false);
      expect(HttpLogic.values.readOnlyMode).toEqual(false);
    });
  });

  describe('http interceptors', () => {
    describe('initializeHttpInterceptors()', () => {
      beforeEach(() => {
        mount();
        jest.spyOn(HttpLogic.actions, 'setHttpInterceptors');
      });

      it('calls http.intercept and sets an array of interceptors', () => {
        mockHttp.intercept
          .mockImplementationOnce(() => 'removeErrorInterceptorFn' as any)
          .mockImplementationOnce(() => 'removeReadOnlyInterceptorFn' as any);
        HttpLogic.actions.initializeHttpInterceptors();

        expect(mockHttp.intercept).toHaveBeenCalled();
        expect(HttpLogic.actions.setHttpInterceptors).toHaveBeenCalledWith([
          'removeErrorInterceptorFn',
          'removeReadOnlyInterceptorFn',
        ]);
      });

      describe('errorConnectingInterceptor', () => {
        let interceptedResponse: any;

        beforeEach(() => {
          interceptedResponse = mockHttp.intercept.mock.calls[0][0].responseError;
          jest.spyOn(HttpLogic.actions, 'onConnectionError');
        });

        it('sets the connection error message if the response header is true', async () => {
          const httpResponse = {
            response: {
              url: '/internal/app_search/engines',
              headers: { get: () => 'true' },
              status: 500,
              statusText: 'Error',
            },
          };
          await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);

          expect(HttpLogic.actions.onConnectionError).toHaveBeenCalledWith('500 Error');
        });

        it('takes no action if the response header is false', async () => {
          const httpResponse = {
            response: {
              url: '/internal/app_search/engines',
              headers: { get: () => 'false' },
            },
          };
          await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);

          expect(HttpLogic.actions.onConnectionError).not.toHaveBeenCalled();
        });

        describe('isEnterpriseSearchApi check', () => {
          let httpResponse: any;

          afterEach(async () => {
            // Should always re-reject the promise and not call setErrorConnecting
            await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);
            expect(HttpLogic.actions.onConnectionError).not.toHaveBeenCalled();
          });

          it('does not handle non-Enterprise Search API calls', async () => {
            httpResponse = {
              response: { url: '/api/some_other_plugin/', headers: { get: () => 'true' } },
            };
          });

          it('does not handle invalid responses', async () => {
            httpResponse = {};
          });
        });
      });

      describe('readOnlyModeInterceptor', () => {
        let interceptedResponse: any;

        beforeEach(() => {
          interceptedResponse = mockHttp.intercept.mock.calls[1][0].response;
          jest.spyOn(HttpLogic.actions, 'setReadOnlyMode');
        });

        it('sets readOnlyMode to true if the response header is true', async () => {
          const httpResponse = {
            response: { url: '/internal/app_search/engines', headers: { get: () => 'true' } },
          };
          await expect(interceptedResponse(httpResponse)).resolves.toEqual(httpResponse);

          expect(HttpLogic.actions.setReadOnlyMode).toHaveBeenCalledWith(true);
        });

        it('sets readOnlyMode to false if the response header is false', async () => {
          const httpResponse = {
            response: {
              url: '/internal/workplace_search/overview',
              headers: { get: () => 'false' },
            },
          };
          await expect(interceptedResponse(httpResponse)).resolves.toEqual(httpResponse);

          expect(HttpLogic.actions.setReadOnlyMode).toHaveBeenCalledWith(false);
        });

        describe('isEnterpriseSearchApi check', () => {
          let httpResponse: any;

          afterEach(async () => {
            // Should always resolve the promise and not call setReadOnlyMode
            await expect(interceptedResponse(httpResponse)).resolves.toEqual(httpResponse);
            expect(HttpLogic.actions.setReadOnlyMode).not.toHaveBeenCalled();
          });

          it('does not handle non-Enterprise Search API calls', async () => {
            httpResponse = {
              response: { url: '/api/some_other_plugin/', headers: { get: () => 'true' } },
            };
          });

          it('does not handle invalid responses', async () => {
            httpResponse = {};
          });
        });
      });
    });

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
