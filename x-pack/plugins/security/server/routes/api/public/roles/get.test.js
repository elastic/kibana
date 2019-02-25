/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';
import { initGetRolesApi } from './get';

const application = 'kibana-.kibana';

const createMockServer = () => {
  const mockServer = new Hapi.Server({ debug: false, port: 8080 });
  return mockServer;
};

describe('GET roles', () => {
  const getRolesTest = (
    description,
    {
      preCheckLicenseImpl = () => null,
      callWithRequestImpl,
      asserts,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initGetRolesApi(mockServer, mockCallWithRequest, pre, application);
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: '/api/security/role',
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
    getRolesTest(`returns result of routePreCheckLicense`, {
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

    getRolesTest(`returns error from callWithRequest`, {
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

    getRolesTest(`throws error if resource isn't * and doesn't have the space: prefix`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: ['default'],
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
        statusCode: 500,
        result: {
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
          statusCode: 500
        }
      },
    });
  });

  describe('success', () => {
    getRolesTest(`transforms elasticsearch privileges`, {
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
            kibana: {
              global: [],
              space: {},
            },
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`transforms matching applications with * resource to kibana global privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: ['*'],
            },
            {
              application,
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
            kibana: {
              global: ['read', 'all'],
              space: {},
            },
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`transforms matching applications with space resources to kibana space privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['space_read'],
              resources: ['space:marketing'],
            },
            {
              application,
              privileges: ['space_all'],
              resources: ['space:marketing'],
            },
            {
              application,
              privileges: ['space_read'],
              resources: ['space:engineering'],
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
            kibana: {
              global: [],
              space: {
                marketing: ['read', 'all'],
                engineering: ['read'],
              }
            },
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`ignores empty resources even though this shouldn't happen`, {
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: [],
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
            kibana: {
              global: [],
              space: {}
            },
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`transforms unrecognized applications`, {
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
            kibana: {
              global: [],
              space: {},
            },
            _unrecognized_applications: ['kibana-.another-kibana']
          },
        ],
      },
    });

    getRolesTest(`returns a sorted list of roles`, {
      callWithRequestImpl: async () => ({
        z_role: {
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
        a_role: {
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
        b_role: {
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
            name: 'a_role',
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
            kibana: {
              global: [],
              space: {},
            },
            _unrecognized_applications: ['kibana-.another-kibana']
          },
          {
            name: 'b_role',
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
            kibana: {
              global: [],
              space: {},
            },
            _unrecognized_applications: ['kibana-.another-kibana']
          },
          {
            name: 'z_role',
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
            kibana: {
              global: [],
              space: {},
            },
            _unrecognized_applications: ['kibana-.another-kibana']
          },
        ],
      },
    });
  });
});

describe('GET role', () => {
  const getRoleTest = (
    description,
    {
      name,
      preCheckLicenseImpl = () => null,
      callWithRequestImpl,
      asserts,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initGetRolesApi(mockServer, mockCallWithRequest, pre, 'kibana-.kibana');
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: `/api/security/role/${name}`,
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
    getRoleTest(`returns result of routePreCheckLicense`, {
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

    getRoleTest(`returns error from callWithRequest`, {
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

    getRoleTest(`throws error if resource isn't * and doesn't have the space: prefix`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: ['default'],
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
        statusCode: 500,
        result: {
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
          statusCode: 500
        }
      },
    });
  });

  describe('success', () => {
    getRoleTest(`transforms elasticsearch privileges`, {
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
          kibana: {
            global: [],
            space: {},
          },
          _unrecognized_applications: [],
        },
      },
    });

    getRoleTest(`transforms matching applications with * resource to kibana global privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: ['*'],
            },
            {
              application,
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
          kibana: {
            global: ['read', 'all'],
            space: {},
          },
          _unrecognized_applications: [],
        },
      },
    });

    getRoleTest(`transforms matching applications with space resource to kibana space privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['space_read'],
              resources: ['space:marketing'],
            },
            {
              application,
              privileges: ['space_all'],
              resources: ['space:marketing'],
            },
            {
              application,
              privileges: ['space_read'],
              resources: ['space:engineering'],
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
          kibana: {
            global: [],
            space: {
              marketing: ['read', 'all'],
              engineering: ['read']
            },
          },
          _unrecognized_applications: [],
        },
      },
    });

    getRoleTest(`ignores empty resources even though this shouldn't happen`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['read'],
              resources: [],
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
          kibana: {
            global: [],
            space: {},
          },
          _unrecognized_applications: [],
        },
      },
    });

    getRoleTest(`transforms unrecognized applications`, {
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
          kibana: {
            global: [],
            space: {},
          },
          _unrecognized_applications: ['kibana-.another-kibana'],
        },
      },
    });
  });
});
