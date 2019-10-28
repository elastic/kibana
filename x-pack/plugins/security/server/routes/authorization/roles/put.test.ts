/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import { RequestHandlerContext } from '../../../../../../../src/core/server';
import { ILicenseCheck } from '../../../../../licensing/server';
import { LICENSE_STATUS } from '../../../../../licensing/server/constants';
import { GLOBAL_RESOURCE } from '../../../../common/constants';
import { definePutRolesRoutes } from './put';

import {
  elasticsearchServiceMock,
  httpServerMock,
} from '../../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../../index.mock';

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
  licenseCheckResult?: ILicenseCheck;
  apiResponses?: Array<() => Promise<unknown>>;
  payload?: Record<string, any>;
  asserts: { statusCode: 204 | 403; result?: Record<string, any>; apiArguments?: unknown[][] };
}

const putRoleTest = (
  description: string,
  {
    name,
    payload,
    licenseCheckResult = { check: LICENSE_STATUS.Valid },
    apiResponses = [],
    asserts,
  }: TestOptions
) => {
  test(description, async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authz.getApplicationName.mockReturnValue(application);
    mockRouteDefinitionParams.authz.privileges.get.mockReturnValue(privilegeMap);

    const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
    for (const apiResponse of apiResponses) {
      mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(apiResponse);
    }

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
    const mockContext = ({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    } as unknown) as RequestHandlerContext;

    const mockResponseResult = { status: asserts.statusCode, options: {} };
    const mockResponse = httpServerMock.createResponseFactory();
    let mockResponseFactory;
    if (asserts.statusCode === 204) {
      mockResponseFactory = mockResponse.noContent;
    } else if (asserts.statusCode === 403) {
      mockResponseFactory = mockResponse.forbidden;
    } else {
      mockResponseFactory = mockResponse.customError;
    }
    mockResponseFactory.mockReturnValue(mockResponseResult);

    const response = await handler(mockContext, mockRequest, mockResponse);

    expect(response).toBe(mockResponseResult);
    expect(mockResponseFactory).toHaveBeenCalledTimes(1);
    if (asserts.result !== undefined) {
      expect(mockResponseFactory).toHaveBeenCalledWith(asserts.result);
    }

    if (Array.isArray(asserts.apiArguments)) {
      for (const apiArguments of asserts.apiArguments) {
        expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(mockRequest);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(...apiArguments);
      }
    } else {
      expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
    }
    expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
  });
};

describe('PUT role', () => {
  describe('request validation', () => {
    let requestBodySchema: Type<any>;
    let requestParamsSchema: Type<any>;
    beforeEach(() => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      mockRouteDefinitionParams.authz.privileges.get.mockReturnValue(privilegeMap);
      definePutRolesRoutes(mockRouteDefinitionParams);

      const [[{ validate }]] = mockRouteDefinitionParams.router.put.mock.calls;
      requestBodySchema = (validate as any).body;
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
        `"[request params.name]: value is [] but it must have a minimum length of [1]."`
      );
    });

    test('requires name in params to not exceed 1024 characters', () => {
      expect(() =>
        requestParamsSchema.validate({ name: 'a'.repeat(1025) }, {}, 'request params')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request params.name]: value is [aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] but it must have a maximum length of [1024]."`
      );
    });

    test('only allows features that match the pattern', () => {
      expect(() =>
        requestBodySchema.validate(
          {
            kibana: [
              {
                feature: {
                  '!foo': ['foo'],
                },
              },
            ],
          },
          {},
          'request body'
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.kibana.0.feature.key(\\"!foo\\")]: only a-z, A-Z, 0-9, '_', and '-' are allowed"`
      );
    });

    test('only allows feature privileges that match the pattern', () => {
      expect(() =>
        requestBodySchema.validate(
          {
            kibana: [
              {
                feature: {
                  foo: ['!foo'],
                },
              },
            ],
          },
          {},
          'request body'
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.kibana.0.feature.foo]: only a-z, A-Z, 0-9, '_', and '-' are allowed"`
      );
    });

    test(`doesn't allow both base and feature in the same entry`, () => {
      expect(() =>
        requestBodySchema.validate(
          {
            kibana: [
              {
                base: ['all'],
                feature: {
                  foo: ['foo'],
                },
              },
            ],
          },
          {},
          'request body'
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.kibana.0]: definition of [feature] isn't allowed when non-empty [base] is defined."`
      );
    });

    describe('global', () => {
      test(`only allows known Kibana global base privileges`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  base: ['foo'],
                  spaces: ['*'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request body.kibana.0.base.0]: unknown global privilege \\"foo\\", must be one of [all,read]"`
        );
      });

      test(`doesn't allow Kibana reserved privileges`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  _reserved: ['customApplication1'],
                  spaces: ['*'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request body.kibana.0._reserved]: definition for this key is missing"`
        );
      });

      test(`only allows one global entry`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  feature: {
                    foo: ['foo-privilege-1'],
                  },
                  spaces: ['*'],
                },
                {
                  feature: {
                    bar: ['bar-privilege-1'],
                  },
                  spaces: ['*'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(`"[request body.kibana]: values are not unique"`);
      });
    });

    describe('space', () => {
      test(`doesn't allow * in a space ID`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  spaces: ['foo-*'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(`
"[request body.kibana.0.spaces]: types that failed validation:
- [request body.kibana.0.spaces.0.0]: expected value to equal [*] but got [foo-*]
- [request body.kibana.0.spaces.1.0]: must be lower case, a-z, 0-9, '_', and '-' are allowed"
`);
      });

      test(`can't assign space and global in same entry`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  spaces: ['*', 'foo-space'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(`
"[request body.kibana.0.spaces]: types that failed validation:
- [request body.kibana.0.spaces.0.1]: expected value to equal [*] but got [foo-space]
- [request body.kibana.0.spaces.1.0]: must be lower case, a-z, 0-9, '_', and '-' are allowed"
`);
      });

      test(`only allows known Kibana space base privileges`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  base: ['foo'],
                  spaces: ['foo-space'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request body.kibana.0.base.0]: unknown space privilege \\"foo\\", must be one of [all,read]"`
        );
      });

      test(`only allows space to be in one entry`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  feature: {
                    foo: ['foo-privilege-1'],
                  },
                  spaces: ['marketing'],
                },
                {
                  feature: {
                    bar: ['bar-privilege-1'],
                  },
                  spaces: ['sales', 'marketing'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(`"[request body.kibana]: values are not unique"`);
      });

      test(`doesn't allow Kibana reserved privileges`, () => {
        expect(() =>
          requestBodySchema.validate(
            {
              kibana: [
                {
                  _reserved: ['customApplication1'],
                  spaces: ['marketing'],
                },
              ],
            },
            {},
            'request body'
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request body.kibana.0._reserved]: definition for this key is missing"`
        );
      });
    });
  });

  describe('failure', () => {
    putRoleTest(`returns result of license checker`, {
      name: 'foo-role',
      licenseCheckResult: { check: LICENSE_STATUS.Invalid, message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { body: { message: 'test forbidden message' } } },
    });
  });

  describe('success', () => {
    putRoleTest(`creates empty role`, {
      name: 'foo-role',
      payload: {},
      apiResponses: [async () => ({}), async () => {}],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [async () => ({}), async () => {}],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [async () => ({}), async () => {}],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [async () => ({}), async () => {}],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [async () => ({}), async () => {}],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [
        async () => ({
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
        async () => {},
      ],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
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
      apiResponses: [
        async () => ({
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
        async () => {},
      ],
      asserts: {
        apiArguments: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
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
        ],
        statusCode: 204,
        result: undefined,
      },
    });
  });
});
