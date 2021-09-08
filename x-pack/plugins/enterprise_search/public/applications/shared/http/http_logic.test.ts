/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetContext } from 'kea';

import { httpServiceMock } from 'src/core/public/mocks';

import { HttpLogic, mountHttpLogic } from './http_logic';

describe('HttpLogic', () => {
  const mockHttp = httpServiceMock.createSetupContract();
  const mount = () => mountHttpLogic({ http: mockHttp });

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  describe('mounts', () => {
    it('sets values from props', () => {
      mountHttpLogic({
        http: mockHttp,
        errorConnecting: true,
        readOnlyMode: true,
      });

      expect(HttpLogic.values).toEqual({
        http: mockHttp,
        httpInterceptors: expect.any(Array),
        errorConnecting: true,
        readOnlyMode: true,
      });
    });
  });

  describe('setErrorConnecting()', () => {
    it('sets errorConnecting value', () => {
      mount();
      expect(HttpLogic.values.errorConnecting).toEqual(false);

      HttpLogic.actions.setErrorConnecting(true);
      expect(HttpLogic.values.errorConnecting).toEqual(true);

      HttpLogic.actions.setErrorConnecting(false);
      expect(HttpLogic.values.errorConnecting).toEqual(false);
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
          jest.spyOn(HttpLogic.actions, 'setErrorConnecting');
        });

        it('sets errorConnecting to true if the response header is true', async () => {
          const httpResponse = {
            response: { url: '/internal/app_search/engines', headers: { get: () => 'true' } },
          };
          await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);

          expect(HttpLogic.actions.setErrorConnecting).toHaveBeenCalledWith(true);
        });

        it('sets errorConnecting to false if the response header is false', async () => {
          const httpResponse = {
            response: {
              url: '/internal/workplace_search/overview',
              headers: { get: () => 'false' },
            },
          };
          await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);

          expect(HttpLogic.actions.setErrorConnecting).toHaveBeenCalledWith(false);
        });

        describe('isEnterpriseSearchApi check', () => {
          let httpResponse: any;

          afterEach(async () => {
            // Should always re-reject the promise and not call setErrorConnecting
            await expect(interceptedResponse(httpResponse)).rejects.toEqual(httpResponse);
            expect(HttpLogic.actions.setErrorConnecting).not.toHaveBeenCalled();
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
