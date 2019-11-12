/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';

import { initCheckPrivilegesApi } from './privileges';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

const createMockServer = () => new Hapi.Server({ debug: false, port: 8080 });

describe('GET privileges', () => {
  const getPrivilegesTest = (
    description,
    {
      preCheckLicenseImpl = () => null,
      callWithRequestImpls = [],
      asserts,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();

      for (const impl of callWithRequestImpls) {
        mockCallWithRequest.mockImplementationOnce(impl);
      }

      initCheckPrivilegesApi(mockServer, mockCallWithRequest, pre);

      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: `${INTERNAL_API_BASE_PATH}/api_key/privileges`,
        headers,
      };

      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();

      if (asserts.callWithRequests) {
        for (const args of asserts.callWithRequests) {
          expect(mockCallWithRequest).toHaveBeenCalledWith(
            expect.objectContaining({
              headers: expect.objectContaining({
                authorization: headers.authorization,
              }),
            }),
            ...args
          );
        }
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }

      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getPrivilegesTest('returns result of routePreCheckLicense', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getPrivilegesTest('returns error from first callWithRequest', {
      callWithRequestImpls: [async () => {
        throw Boom.notAcceptable('test not acceptable message');
      }, async () => { }],
      asserts: {
        callWithRequests: [
          ['shield.hasPrivileges', {
            body: {
              cluster: [
                'manage_security',
                'manage_api_key',
              ],
            },
          }],
          ['shield.getAPIKeys', { owner: true }],
        ],
        statusCode: 406,
        result: {
          error: 'Not Acceptable',
          statusCode: 406,
          message: 'test not acceptable message',
        },
      },
    });

    getPrivilegesTest('returns error from second callWithRequest', {
      callWithRequestImpls: [async () => { }, async () => {
        throw Boom.notAcceptable('test not acceptable message');
      }],
      asserts: {
        callWithRequests: [
          ['shield.hasPrivileges', {
            body: {
              cluster: [
                'manage_security',
                'manage_api_key',
              ],
            },
          }],
          ['shield.getAPIKeys', { owner: true }],
        ],
        statusCode: 406,
        result: {
          error: 'Not Acceptable',
          statusCode: 406,
          message: 'test not acceptable message',
        },
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest('returns areApiKeysEnabled and isAdmin', {
      callWithRequestImpls: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: true, manage_security: true },
          index: {},
          application: {}
        }),
        async () => (
          {
            api_keys:
              [{
                id: 'si8If24B1bKsmSLTAhJV',
                name: 'my-api-key',
                creation: 1574089261632,
                expiration: 1574175661632,
                invalidated: false,
                username: 'elastic',
                realm: 'reserved'
              }]
          }
        ),
      ],
      asserts: {
        callWithRequests: [
          ['shield.getAPIKeys', { owner: true }],
          ['shield.hasPrivileges', {
            body: {
              cluster: [
                'manage_security',
                'manage_api_key',
              ],
            },
          }],
        ],
        statusCode: 200,
        result: {
          areApiKeysEnabled: true,
          isAdmin: true,
        },
      },
    });

    getPrivilegesTest('returns areApiKeysEnabled=false when getAPIKeys error message includes "api keys are not enabled"', {
      callWithRequestImpls: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: true, manage_security: true },
          index: {},
          application: {}
        }),
        async () => {
          throw Boom.unauthorized('api keys are not enabled');
        },
      ],
      asserts: {
        callWithRequests: [
          ['shield.getAPIKeys', { owner: true }],
          ['shield.hasPrivileges', {
            body: {
              cluster: [
                'manage_security',
                'manage_api_key',
              ],
            },
          }],
        ],
        statusCode: 200,
        result: {
          areApiKeysEnabled: false,
          isAdmin: true,
        },
      },
    });

    getPrivilegesTest('returns isAdmin=false when user has insufficient privileges', {
      callWithRequestImpls: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: false, manage_security: false },
          index: {},
          application: {}
        }),
        async () => (
          {
            api_keys:
              [{
                id: 'si8If24B1bKsmSLTAhJV',
                name: 'my-api-key',
                creation: 1574089261632,
                expiration: 1574175661632,
                invalidated: false,
                username: 'elastic',
                realm: 'reserved'
              }]
          }
        ),
      ],
      asserts: {
        callWithRequests: [
          ['shield.getAPIKeys', { owner: true }],
          ['shield.hasPrivileges', {
            body: {
              cluster: [
                'manage_security',
                'manage_api_key',
              ],
            },
          }],
        ],
        statusCode: 200,
        result: {
          areApiKeysEnabled: true,
          isAdmin: false,
        },
      },
    });
  });
});
