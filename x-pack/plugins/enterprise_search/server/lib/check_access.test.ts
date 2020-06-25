/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('node-fetch');
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

import { loggingSystemMock } from 'src/core/server/mocks';

import { checkAccess } from './check_access';

describe('checkAccess', () => {
  const mockConfig = {
    host: 'http://localhost:3002',
    accessCheckTimeout: 200,
  };
  const mockSecurity = {
    authz: {
      mode: {
        useRbacForRequest: () => true,
      },
      checkPrivilegesWithRequest: () => ({
        globally: () => ({
          hasAllRequested: false,
        }),
      }),
    },
  };
  const mockRequest = {
    url: { path: '/app/kibana' },
    headers: { authorization: '==someAuth' },
  };
  const mockDependencies = {
    enterpriseSearchPath: 'as',
    config: mockConfig,
    security: mockSecurity,
    request: mockRequest,
    log: loggingSystemMock.create().get(),
  } as any;

  describe('when security is disabled', () => {
    it('should always show the plugin', async () => {
      const security = undefined;
      expect(await checkAccess({ ...mockDependencies, security })).toEqual(true);
    });
  });

  describe('when the user is a superuser', () => {
    it('should always show the plugin', async () => {
      const security = {
        ...mockSecurity,
        authz: {
          mode: { useRbacForRequest: () => true },
          checkPrivilegesWithRequest: () => ({
            globally: () => ({
              hasAllRequested: true,
            }),
          }),
          actions: { ui: { get: () => {} } },
        },
      };
      expect(await checkAccess({ ...mockDependencies, security })).toEqual(true);
    });
  });

  describe('when the user is a non-superuser', () => {
    describe('when enterpriseSearch.host is not set in kibana.yml', () => {
      it('should hide the plugin', async () => {
        const config = { host: undefined };
        expect(await checkAccess({ ...mockDependencies, config })).toEqual(false);
      });
    });

    describe('when enterpriseSearch.host is called via http', () => {
      describe('when the response returns OK', () => {
        it('should show the plugin', async () => {
          fetchMock.mockImplementationOnce((url: string) => {
            expect(url).toEqual('http://localhost:3002/as');
            return Promise.resolve(new Response('{}'));
          });

          expect(await checkAccess({ ...mockDependencies })).toEqual(true);
        });
      });

      describe('when the user is redirected to /login', () => {
        it('should hide the plugin', async () => {
          fetchMock.mockImplementationOnce((url: string) => {
            expect(url).toEqual('http://localhost:3002/as');
            return Promise.resolve(new Response('{}', { url: '/login' }));
          });
          expect(await checkAccess({ ...mockDependencies })).toEqual(false);
        });
      });

      describe('when the server responds with any error', () => {
        it('should hide the plugin', async () => {
          fetchMock.mockImplementationOnce((url: string) => {
            expect(url).toEqual('http://localhost:3002/as');
            return Promise.reject('Failed');
          });
          expect(await checkAccess({ ...mockDependencies })).toEqual(false);
          expect(mockDependencies.log.error).toHaveBeenCalledWith(
            'Could not perform access check to Enterprise Search: Failed'
          );
        });
      });

      describe('when the call times out', () => {
        it('should hide the plugin', async () => {
          jest.useFakeTimers();

          fetchMock.mockImplementationOnce(async () => {
            jest.advanceTimersByTime(250);
            return Promise.reject({ name: 'AbortError' });
          });

          expect(await checkAccess({ ...mockDependencies })).toEqual(false);
          expect(mockDependencies.log.warn).toHaveBeenCalledWith(
            "Exceeded timeout while checking http://localhost:3002 for user access. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses."
          );
        });
      });
    });

    it("falls back to assuming a non-superuser role if a user's roles cannot be accessed", async () => {
      const security = {
        ...mockSecurity,
        authz: {
          mode: { useRbacForRequest: () => true },
          checkPrivilegesWithRequest: undefined,
        },
      };
      expect(await checkAccess({ ...mockDependencies, security })).toEqual(false);
    });
  });
});
