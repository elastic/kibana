/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';

import type { LicenseCheck } from '../../../../../licensing/server';
import { routeDefinitionParamsMock } from '../../index.mock';
import { defineGetAllRolesRoutes } from './get_all';

const application = 'kibana-.kibana';
const reservedPrivilegesApplicationWildcard = 'kibana-*';

interface TestOptions {
  name?: string;
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => unknown;
  asserts: { statusCode: number; result?: Record<string, any> };
}

describe('GET all roles', () => {
  const getRolesTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponse, asserts }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      mockRouteDefinitionParams.authz.applicationName = application;
      mockRouteDefinitionParams.getFeatures = jest.fn().mockResolvedValue([]);

      const mockCoreContext = coreMock.createRequestHandlerContext();
      const mockLicensingContext = {
        license: { check: jest.fn().mockReturnValue(licenseCheckResult) },
      } as any;
      const mockContext = coreMock.createCustomRequestHandlerContext({
        core: mockCoreContext,
        licensing: mockLicensingContext,
      });

      if (apiResponse) {
        mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole.mockResponseImplementation(
          (() => ({ body: apiResponse() })) as any
        );
      }

      defineGetAllRolesRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: '/api/security/role',
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(
          mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole
        ).toHaveBeenCalled();
      }
      expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getRolesTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getRolesTest('returns error from cluster client', {
      apiResponse: async () => {
        throw error;
      },
      asserts: { statusCode: 406, result: error },
    });

    getRolesTest(`return error if we have empty resources`, {
      apiResponse: () => ({
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
        statusCode: 500,
        result: new Error("ES returned an application entry without resources, can't process this"),
      },
    });
  });

  describe('success', () => {
    getRolesTest(`transforms elasticsearch privileges`, {
      apiResponse: () => ({
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
            _transform_error: [],
            _unrecognized_applications: [],
          },
        ],
      },
    });

    describe('global', () => {
      getRolesTest(
        `transforms matching applications with * resource to kibana global base privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: ['all', 'read'],
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
                    base: ['all', 'read'],
                    feature: {},
                    spaces: ['*'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with * resource to kibana global feature privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: [
                    'feature_foo.foo-privilege-1',
                    'feature_foo.foo-privilege-2',
                    'feature_bar.bar-privilege-1',
                  ],
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
                    base: [],
                    feature: {
                      foo: ['foo-privilege-1', 'foo-privilege-2'],
                      bar: ['bar-privilege-1'],
                    },
                    spaces: ['*'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with * resource to kibana _reserved privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application: reservedPrivilegesApplicationWildcard,
                  privileges: ['reserved_customApplication1', 'reserved_customApplication2'],
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
                    _reserved: ['customApplication1', 'customApplication2'],
                    base: [],
                    feature: {},
                    spaces: ['*'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );

      getRolesTest(
        `transforms applications with wildcard and * resource to kibana _reserved privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application: reservedPrivilegesApplicationWildcard,
                  privileges: ['reserved_customApplication1', 'reserved_customApplication2'],
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
                    _reserved: ['customApplication1', 'customApplication2'],
                    base: [],
                    feature: {},
                    spaces: ['*'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );
    });

    describe('space', () => {
      getRolesTest(
        `transforms matching applications with space resources to kibana space base privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: ['space_all', 'space_read'],
                  resources: ['space:marketing', 'space:sales'],
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
                kibana: [
                  {
                    base: ['all', 'read'],
                    feature: {},
                    spaces: ['marketing', 'sales'],
                  },
                  {
                    base: ['read'],
                    feature: {},
                    spaces: ['engineering'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with space resources to kibana space feature privileges`,
        {
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: [
                    'feature_foo.foo-privilege-1',
                    'feature_foo.foo-privilege-2',
                    'feature_bar.bar-privilege-1',
                  ],
                  resources: ['space:marketing', 'space:sales'],
                },
                {
                  application,
                  privileges: ['feature_foo.foo-privilege-1'],
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
                kibana: [
                  {
                    base: [],
                    feature: {
                      foo: ['foo-privilege-1', 'foo-privilege-2'],
                      bar: ['bar-privilege-1'],
                    },
                    spaces: ['marketing', 'sales'],
                  },
                  {
                    base: [],
                    feature: {
                      foo: ['foo-privilege-1'],
                    },
                    spaces: ['engineering'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );
    });

    getRolesTest(
      `resource not * without space: prefix returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `* and a space in the same entry returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
                resources: ['*', 'space:engineering'],
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `* appearing in multiple entries returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
                resources: ['*'],
              },
              {
                application,
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `space appearing in multiple entries returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all'],
                resources: ['space:engineering'],
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `space privilege assigned globally returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all'],
                resources: ['*'],
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `space privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: reservedPrivilegesApplicationWildcard,
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: reservedPrivilegesApplicationWildcard,
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['reserved_foo'],
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
              kibana: [],
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned with a base privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['reserved_foo', 'read'],
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned with a feature privilege returns populated kibana section`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['feature_foo.foo-privilege-1'],
                resources: ['*'],
              },
              {
                application: reservedPrivilegesApplicationWildcard,
                privileges: ['reserved_foo'],
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
                  base: [],
                  feature: {
                    foo: ['foo-privilege-1'],
                  },
                  spaces: ['*'],
                },
                {
                  base: [],
                  feature: {},
                  _reserved: ['foo'],
                  spaces: ['*'],
                },
              ],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all', 'feature_foo.foo-privilege-1'],
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(
      `space base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'feature_foo.foo-privilege-1'],
                resources: ['space:space_1'],
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
              _transform_error: ['kibana'],
              _unrecognized_applications: [],
            },
          ],
        },
      }
    );

    getRolesTest(`transforms unrecognized applications`, {
      apiResponse: () => ({
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
            _transform_error: [],
            _unrecognized_applications: ['kibana-.another-kibana'],
          },
        ],
      },
    });

    getRolesTest(`returns a sorted list of roles`, {
      apiResponse: () => ({
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
            kibana: [],
            _transform_error: [],
            _unrecognized_applications: ['kibana-.another-kibana'],
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
            kibana: [],
            _transform_error: [],
            _unrecognized_applications: ['kibana-.another-kibana'],
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
            kibana: [],
            _transform_error: [],
            _unrecognized_applications: ['kibana-.another-kibana'],
          },
        ],
      },
    });
  });
});
