/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';
import { initRolesApi } from './roles';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
jest.mock('../../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('../../../lib/route_pre_check_license', () => ({
  routePreCheckLicense: jest.fn(),
}));

beforeEach(() => {
  getClient.mockReset();
  routePreCheckLicense.mockReset();
});

const registerMockCallWithRequest = () => {
  const callWithRequest = jest.fn();
  getClient.mockReturnValue({
    callWithRequest,
  });
  return callWithRequest;
};

const createMockServer = () => {
  const mockConfig = { get: jest.fn() };
  const mockServer = new Hapi.Server({ debug: false });
  mockServer.config = () => mockConfig;
  mockServer.connection({ port: 8080 });
  mockServer.plugins = {
    security: {
      authorization: {
        application: 'kibana-.kibana',
      },
    },
  };
  return mockServer;
};

const mockRoutePreCheckLicense = impl => {
  const routePreCheckLicenseImpl = jest.fn().mockImplementation(impl);
  routePreCheckLicense.mockReturnValue(routePreCheckLicenseImpl);
  return routePreCheckLicenseImpl;
};

describe('GET roles', () => {
  const getTest = (
    description,
    {
      preCheckLicenseImpl = (request, reply) => reply(),
      callWithRequestImpl,
      asserts,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = mockRoutePreCheckLicense(preCheckLicenseImpl);
      const mockCallWithRequest = registerMockCallWithRequest();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initRolesApi(mockServer);
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: '/api/security/roles',
        headers,
      };
      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();
      if (callWithRequestImpl) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          'shield.getRole'
        );
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }
      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getTest(`returns result of routePreCheckLicense`, {
      preCheckLicenseImpl: (request, reply) =>
        reply(Boom.forbidden('test forbidden message')),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getTest(`returns error from callWithRequest`, {
      callWithRequestImpl: async () => {
        throw Boom.notAcceptable('test not acceptable message');
      },
      asserts: {
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
    getTest(`transforms elasticsearch privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: ['manage_watcher'],
          indices: [
            {
              names: ['.kibana*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          applications: [],
          run_as: ['other_user'],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: ['manage_watcher'],
              indices: [
                {
                  names: ['.kibana*'],
                  privileges: ['read', 'view_index_metadata'],
                },
              ],
              run_as: ['other_user'],
            },
            kibana: [],
          },
        ],
      },
    });

    getTest(`transforms matching applications to kibana privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['*'],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['all'],
              resources: ['*'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                privileges: ['read'],
              },
              {
                privileges: ['all'],
              },
            ],
          },
        ],
      },
    });

    getTest(`excludes resources other than * from kibana privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              // Elasticsearch should prevent this from happening
              resources: [],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['default', '*'],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['some-other-space'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [],
          },
        ],
      },
    });

    getTest(`excludes other application from kibana privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.another-kibana',
              privileges: ['read'],
              resources: ['*'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [],
          },
        ],
      },
    });
  });
});

describe('GET role', () => {
  const getTest = (
    description,
    {
      name,
      preCheckLicenseImpl = (request, reply) => reply(),
      callWithRequestImpl,
      asserts,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = mockRoutePreCheckLicense(preCheckLicenseImpl);
      const mockCallWithRequest = registerMockCallWithRequest();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initRolesApi(mockServer);
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: `/api/security/roles/${name}`,
        headers,
      };
      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();
      if (callWithRequestImpl) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          'shield.getRole',
          { name }
        );
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }
      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getTest(`returns result of routePreCheckLicense`, {
      preCheckLicenseImpl: (request, reply) =>
        reply(Boom.forbidden('test forbidden message')),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getTest(`returns error from callWithRequest`, {
      name: 'foo-role',
      callWithRequestImpl: async () => {
        throw Boom.notAcceptable('test not acceptable message');
      },
      asserts: {
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
    getTest(`transforms elasticsearch privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: ['manage_watcher'],
          indices: [
            {
              names: ['.kibana*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          applications: [],
          run_as: ['other_user'],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
          elasticsearch: {
            cluster: ['manage_watcher'],
            indices: [
              {
                names: ['.kibana*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
            run_as: ['other_user'],
          },
          kibana: [],
        },
      },
    });

    getTest(`transforms matching applications to kibana privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['*'],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['all'],
              resources: ['*'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [
            {
              privileges: ['read'],
            },
            {
              privileges: ['all'],
            },
          ],
        },
      },
    });

    getTest(`excludes resources other than * from kibana privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              // Elasticsearch should prevent this from happening
              resources: [],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['default', '*'],
            },
            {
              application: 'kibana-.kibana',
              privileges: ['read'],
              resources: ['some-other-space'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [],
        },
      },
    });

    getTest(`excludes other application from kibana privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.another-kibana',
              privileges: ['read'],
              resources: ['*'],
            },
          ],
          run_as: [],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [],
        },
      },
    });
  });
});
