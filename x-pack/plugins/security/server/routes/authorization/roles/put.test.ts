/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { kibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';

import { KibanaFeature } from '../../../../../features/server';
import type { LicenseCheck } from '../../../../../licensing/server';
import { GLOBAL_RESOURCE } from '../../../../common/constants';
import { securityFeatureUsageServiceMock } from '../../../feature_usage/index.mock';
import { routeDefinitionParamsMock } from '../../index.mock';
import { definePutRolesRoutes } from './put';

const application = 'kibana-.kibana';
const privilegeMap = {
  global: {
    all: [],
    read: [],
  },
  space: {
    all: [],
    read: [],
  },
  features: {
    foo: {
      'foo-privilege-1': [],
      'foo-privilege-2': [],
    },
    bar: {
      'bar-privilege-1': [],
      'bar-privilege-2': [],
    },
  },
  reserved: {
    customApplication1: [],
    customApplication2: [],
  },
};

interface TestOptions {
  name: string;
  licenseCheckResult?: LicenseCheck;
  apiResponses?: {
    get: () => unknown;
    put: () => unknown;
  };
  payload?: Record<string, any>;
  asserts: {
    statusCode: number;
    result?: Record<string, any>;
    apiArguments?: { get: unknown[]; put: unknown[] };
    recordSubFeaturePrivilegeUsage?: boolean;
  };
  features?: KibanaFeature[];
}

const putRoleTest = (
  description: string,
  {
    name,
    payload,
    licenseCheckResult = { state: 'valid' },
    apiResponses,
    asserts,
    features,
  }: TestOptions
) => {
  test(description, async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authz.applicationName = application;
    mockRouteDefinitionParams.authz.privileges.get.mockReturnValue(privilegeMap);

    const mockContext = {
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
    };

    if (apiResponses?.get) {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRole.mockResponseImplementationOnce(
        (() => ({ body: apiResponses?.get() })) as any
      );
    }

    if (apiResponses?.put) {
      mockContext.core.elasticsearch.client.asCurrentUser.security.putRole.mockResponseImplementationOnce(
        (() => ({ body: apiResponses?.put() })) as any
      );
    }

    mockRouteDefinitionParams.getFeatureUsageService.mockReturnValue(
      securityFeatureUsageServiceMock.createStartContract()
    );

    mockRouteDefinitionParams.getFeatures.mockResolvedValue(
      features ?? [
        new KibanaFeature({
          id: 'feature_1',
          name: 'feature 1',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              ui: [],
              savedObject: { all: [], read: [] },
            },
            read: {
              ui: [],
              savedObject: { all: [], read: [] },
            },
          },
          subFeatures: [
            {
              name: 'sub feature 1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'sub_feature_privilege_1',
                      name: 'first sub-feature privilege',
                      includeIn: 'none',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ]
    );

    definePutRolesRoutes(mockRouteDefinitionParams);
    const [[{ validate }, handler]] = mockRouteDefinitionParams.router.put.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'put',
      path: `/api/security/role/${name}`,
      params: { name },
      body: payload !== undefined ? (validate as any).body.validate(payload) : undefined,
      headers,
    });

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(asserts.statusCode);
    expect(response.payload).toEqual(asserts.result);

    if (asserts.apiArguments?.get) {
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.getRole
      ).toHaveBeenCalledWith(...asserts.apiArguments?.get);
    }
    if (asserts.apiArguments?.put) {
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRole
      ).toHaveBeenCalledWith(...asserts.apiArguments?.put);
    }
    expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');

    if (asserts.recordSubFeaturePrivilegeUsage) {
      expect(
        mockRouteDefinitionParams.getFeatureUsageService().recordSubFeaturePrivilegeUsage
      ).toHaveBeenCalledTimes(1);
    } else {
      expect(
        mockRouteDefinitionParams.getFeatureUsageService().recordSubFeaturePrivilegeUsage
      ).not.toHaveBeenCalled();
    }
  });
};

describe('PUT role', () => {
  describe('request validation', () => {
    let requestParamsSchema: Type<any>;
    beforeEach(() => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      mockRouteDefinitionParams.authz.privileges.get.mockReturnValue(privilegeMap);
      definePutRolesRoutes(mockRouteDefinitionParams);

      const [[{ validate }]] = mockRouteDefinitionParams.router.put.mock.calls;
      requestParamsSchema = (validate as any).params;
    });

    test('requires name in params', () => {
      expect(() =>
        requestParamsSchema.validate({}, {}, 'request params')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request params.name]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        requestParamsSchema.validate({ name: '' }, {}, 'request params')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request params.name]: value has length [0] but it must have a minimum length of [1]."`
      );
    });

    test('requires name in params to not exceed 1024 characters', () => {
      expect(() =>
        requestParamsSchema.validate({ name: 'a'.repeat(1025) }, {}, 'request params')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request params.name]: value has length [1025] but it must have a maximum length of [1024]."`
      );
    });
  });

  describe('failure', () => {
    putRoleTest('returns result of license checker', {
      name: 'foo-role',
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    describe('feature validation', () => {
      const fooFeature = new KibanaFeature({
        id: 'bar',
        name: 'bar',
        privileges: {
          all: {
            requireAllSpaces: true,
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            disabled: true,
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
        app: [],
        category: { id: 'bar', label: 'bar' },
      });

      putRoleTest('returns validation errors', {
        name: 'bar-role',
        payload: {
          kibana: [
            {
              spaces: ['bar-space'],
              base: [],
              feature: {
                bar: ['all', 'read'],
              },
            },
          ],
        },
        features: [fooFeature],
        asserts: {
          statusCode: 400,
          result: {
            message:
              'Role cannot be updated due to validation errors: ["Feature privilege [bar.all] requires all spaces to be selected but received [bar-space]","Feature [bar] does not support privilege [read]."]',
          },
        },
      });
    });
  });

  describe('success', () => {
    putRoleTest(`creates empty role`, {
      name: 'foo-role',
      payload: {},
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`if spaces isn't specified, defaults to global`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: ['all'],
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['all'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`allows base with empty array and feature in the same entry`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: [],
            feature: {
              foo: ['foo'],
            },
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['feature_foo.foo'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`allows base and feature with empty object in the same entry`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: ['all'],
            feature: {},
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['all'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`creates role with everything`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2'],
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            base: ['all', 'read'],
            spaces: ['*'],
          },
          {
            base: ['all', 'read'],
            spaces: ['test-space-1', 'test-space-2'],
          },
          {
            feature: {
              foo: ['foo-privilege-1', 'foo-privilege-2'],
            },
            spaces: ['test-space-3'],
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['all', 'read'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: ['space_all', 'space_read'],
                    resources: ['space:test-space-1', 'space:test-space-2'],
                  },
                  {
                    application,
                    privileges: ['feature_foo.foo-privilege-1', 'feature_foo.foo-privilege-2'],
                    resources: ['space:test-space-3'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2'],
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`updates role which has existing kibana privileges`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2'],
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            feature: {
              foo: ['foo-privilege-1'],
              bar: ['bar-privilege-1'],
            },
            spaces: ['*'],
          },
          {
            base: ['all'],
            spaces: ['test-space-1', 'test-space-2'],
          },
          {
            feature: {
              bar: ['bar-privilege-2'],
            },
            spaces: ['test-space-3'],
          },
        ],
      },
      apiResponses: {
        get: () => ({
          'foo-role': {
            metadata: {
              bar: 'old-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
            cluster: ['old-cluster-privilege'],
            indices: [
              {
                field_security: {
                  grant: ['old-field-security-grant-1', 'old-field-security-grant-2'],
                  except: ['old-field-security-except-1', 'old-field-security-except-2'],
                },
                names: ['old-index-name'],
                privileges: ['old-privilege'],
                query: `{ "match": { "old-title": "foo" } }`,
              },
            ],
            run_as: ['old-run-as'],
            applications: [
              {
                application,
                privileges: ['old-kibana-privilege'],
                resources: ['old-resource'],
              },
            ],
          },
        }),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['feature_foo.foo-privilege-1', 'feature_bar.bar-privilege-1'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: ['space_all'],
                    resources: ['space:test-space-1', 'space:test-space-2'],
                  },
                  {
                    application,
                    privileges: ['feature_bar.bar-privilege-2'],
                    resources: ['space:test-space-3'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2'],
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`updates role which has existing other application privileges`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            base: ['all', 'read'],
            spaces: ['*'],
          },
        ],
      },
      apiResponses: {
        get: () => ({
          'foo-role': {
            metadata: {
              bar: 'old-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
            cluster: ['old-cluster-privilege'],
            indices: [
              {
                names: ['old-index-name'],
                privileges: ['old-privilege'],
              },
            ],
            run_as: ['old-run-as'],
            applications: [
              {
                application,
                privileges: ['old-kibana-privilege'],
                resources: ['old-resource'],
              },
              {
                application: 'logstash-foo',
                privileges: ['logstash-privilege'],
                resources: ['logstash-resource'],
              },
              {
                application: 'beats-foo',
                privileges: ['beats-privilege'],
                resources: ['beats-resource'],
              },
            ],
          },
        }),
        put: () => {},
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['all', 'read'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application: 'logstash-foo',
                    privileges: ['logstash-privilege'],
                    resources: ['logstash-resource'],
                  },
                  {
                    application: 'beats-foo',
                    privileges: ['beats-privilege'],
                    resources: ['beats-resource'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`notifies when sub-feature privileges are included`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            spaces: ['*'],
            feature: {
              feature_1: ['sub_feature_privilege_1'],
            },
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        recordSubFeaturePrivilegeUsage: true,
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application: 'kibana-.kibana',
                    privileges: ['feature_feature_1.sub_feature_privilege_1'],
                    resources: ['*'],
                  },
                ],
                metadata: undefined,
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`does not record sub-feature privilege usage for unknown privileges`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            spaces: ['*'],
            feature: {
              feature_1: ['unknown_sub_feature_privilege_1'],
            },
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        recordSubFeaturePrivilegeUsage: false,
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application: 'kibana-.kibana',
                    privileges: ['feature_feature_1.unknown_sub_feature_privilege_1'],
                    resources: ['*'],
                  },
                ],
                metadata: undefined,
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });

    putRoleTest(`does not record sub-feature privilege usage for unknown features`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            spaces: ['*'],
            feature: {
              unknown_feature: ['sub_feature_privilege_1'],
            },
          },
        ],
      },
      apiResponses: {
        get: () => ({}),
        put: () => {},
      },
      asserts: {
        recordSubFeaturePrivilegeUsage: false,
        apiArguments: {
          get: [{ name: 'foo-role' }, { ignore: [404] }],
          put: [
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application: 'kibana-.kibana',
                    privileges: ['feature_unknown_feature.sub_feature_privilege_1'],
                    resources: ['*'],
                  },
                ],
                metadata: undefined,
              },
            },
          ],
        },
        statusCode: 204,
        result: undefined,
      },
    });
  });
});
