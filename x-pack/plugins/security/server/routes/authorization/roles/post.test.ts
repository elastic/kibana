/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { KibanaFeature } from '@kbn/features-plugin/server';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';
import { GLOBAL_RESOURCE } from '@kbn/security-plugin-types-server';

import type { BulkCreateOrUpdateRolesPayloadSchemaType } from './model/bulk_create_or_update_payload';
import { defineBulkCreateOrUpdateRolesRoutes } from './post';
import { securityFeatureUsageServiceMock } from '../../../feature_usage/index.mock';
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

const kibanaFeature = new KibanaFeature({
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

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  apiResponses?: {
    get: () => unknown;
    post: () => Record<string, unknown>;
  };
  payload: BulkCreateOrUpdateRolesPayloadSchemaType;
  asserts: {
    statusCode: number;
    result?: Record<string, any>;
    apiArguments?: { get: unknown[]; post: unknown[] };
    recordSubFeaturePrivilegeUsage?: boolean;
  };
  features?: KibanaFeature[];
}

const postRolesTest = (
  description: string,
  { payload, licenseCheckResult = { state: 'valid' }, apiResponses, asserts, features }: TestOptions
) => {
  test(description, async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authz.applicationName = application;
    mockRouteDefinitionParams.authz.privileges.get.mockReturnValue(privilegeMap);

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const mockLicensingContext = {
      license: { check: jest.fn().mockReturnValue(licenseCheckResult) },
    } as any;
    const mockContext = coreMock.createCustomRequestHandlerContext({
      core: mockCoreContext,
      licensing: mockLicensingContext,
    });

    if (apiResponses?.get) {
      mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole.mockResponseImplementationOnce(
        (() => ({ body: apiResponses?.get() })) as any
      );
    }

    if (apiResponses?.post) {
      mockCoreContext.elasticsearch.client.asCurrentUser.transport.request.mockImplementationOnce(
        (() => ({ ...apiResponses?.post() })) as any
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

    defineBulkCreateOrUpdateRolesRoutes(mockRouteDefinitionParams);
    const [[{ validate }, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/security/roles',
      body: payload !== undefined ? (validate as any).body.validate(payload) : undefined,
      headers,
    });

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(asserts.statusCode);
    expect(response.payload).toEqual(asserts.result);

    if (asserts.apiArguments?.get) {
      expect(
        mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole
      ).toHaveBeenCalledWith(...asserts.apiArguments?.get);
    }
    if (asserts.apiArguments?.post) {
      const [body] = asserts.apiArguments?.post ?? [];
      expect(
        mockCoreContext.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/role',
        body,
      });
    }
    expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');

    if (asserts.recordSubFeaturePrivilegeUsage) {
      expect(
        mockRouteDefinitionParams.getFeatureUsageService().recordSubFeaturePrivilegeUsage
      ).toHaveBeenCalledTimes(
        (response.payload?.created?.length ?? 0) +
          (response.payload?.updated?.length ?? 0) +
          (response.payload?.noop?.length ?? 0)
      );
    } else {
      expect(
        mockRouteDefinitionParams.getFeatureUsageService().recordSubFeaturePrivilegeUsage
      ).not.toHaveBeenCalled();
    }
  });
};

describe('POST roles', () => {
  describe('failure', () => {
    postRolesTest('returns result of license checker', {
      payload: { roles: {} } as BulkCreateOrUpdateRolesPayloadSchemaType,
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });
  });

  describe('success', () => {
    postRolesTest(`creates empty roles`, {
      payload: {
        roles: {
          'role-1': {
            elasticsearch: {},
            kibana: [],
          },
          'role-2': {
            elasticsearch: {},
            kibana: [],
          },
        },
      },
      apiResponses: {
        get: () => ({}),
        post: () => ({ created: ['role-1', 'role-2'] }),
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'role-1,role-2' }, { ignore: [404] }],
          post: [
            {
              roles: {
                'role-1': {
                  applications: [],
                  cluster: [],
                  indices: [],
                  remote_indices: undefined,
                  remote_cluster: undefined,
                  run_as: [],
                  metadata: undefined,
                },
                'role-2': {
                  applications: [],
                  cluster: [],
                  indices: [],
                  remote_indices: undefined,
                  remote_cluster: undefined,
                  run_as: [],
                  metadata: undefined,
                },
              },
            },
          ],
        },
        statusCode: 200,
        result: { created: ['role-1', 'role-2'] },
      },
    });

    postRolesTest('returns validation errors', {
      payload: {
        roles: {
          'role-1': {
            elasticsearch: {},
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
        },
      },
      apiResponses: {
        get: () => ({}),
        post: () => ({}),
      },
      features: [kibanaFeature],
      asserts: {
        statusCode: 200,
        result: {
          errors: {
            'role-1': {
              type: 'kibana_privilege_validation_exception',
              reason:
                'Role cannot be updated due to validation errors: ["Feature privilege [bar.all] requires all spaces to be selected but received [bar-space]","Feature [bar] does not support privilege [read]."]',
            },
          },
        },
      },
    });

    postRolesTest(`returns errors for not updated/created roles`, {
      payload: {
        roles: {
          'role-1': {
            elasticsearch: {},
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
          'role-2': {
            elasticsearch: {
              indices: [
                {
                  names: ['test-index-name-1', 'test-index-name-2'],
                  privileges: ['test'],
                },
              ],
            },
          },
          'role-3': {
            elasticsearch: {},
            kibana: [],
          },
        },
      },
      features: [kibanaFeature],
      apiResponses: {
        get: () => ({}),
        post: () => ({
          created: ['role-3'],
          errors: {
            count: 1,
            details: {
              'role-2': {
                type: 'action_request_validation_exception',
                reason: 'Validation Failed',
              },
            },
          },
        }),
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'role-2,role-3' }, { ignore: [404] }],
          post: [
            {
              roles: {
                'role-2': {
                  applications: [],
                  cluster: [],
                  indices: [
                    {
                      names: ['test-index-name-1', 'test-index-name-2'],
                      privileges: ['test'],
                    },
                  ],
                  remote_indices: undefined,
                  remote_cluster: undefined,
                  run_as: [],
                  metadata: undefined,
                },
                'role-3': {
                  applications: [],
                  cluster: [],
                  indices: [],
                  remote_indices: undefined,
                  remote_cluster: undefined,
                  run_as: [],
                  metadata: undefined,
                },
              },
            },
          ],
        },
        statusCode: 200,
        result: {
          created: ['role-3'],
          errors: {
            'role-1': {
              type: 'kibana_privilege_validation_exception',
              reason:
                'Role cannot be updated due to validation errors: ["Feature privilege [bar.all] requires all spaces to be selected but received [bar-space]","Feature [bar] does not support privilege [read]."]',
            },
            'role-2': {
              reason: 'Validation Failed',
              type: 'action_request_validation_exception',
            },
          },
        },
      },
    });

    postRolesTest(
      `creates non-existing role and updates role which has existing kibana privileges`,
      {
        payload: {
          roles: {
            'new-role': {
              kibana: [],
              elasticsearch: {
                remote_cluster: [
                  {
                    clusters: ['cluster1', 'cluster2'],
                    privileges: ['monitor_enrich'],
                  },
                  {
                    clusters: ['cluster3', 'cluster4'],
                    privileges: ['monitor_enrich'],
                  },
                ],
              },
            },
            'existing-role': {
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
          },
        },
        apiResponses: {
          get: () => ({
            'existing-role': {
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
          post: () => ({ updated: ['existing-role'], created: ['new-role'] }),
        },
        asserts: {
          apiArguments: {
            get: [{ name: 'new-role,existing-role' }, { ignore: [404] }],
            post: [
              {
                roles: {
                  'new-role': {
                    applications: [],
                    cluster: [],
                    indices: [],
                    remote_indices: undefined,
                    run_as: [],
                    remote_cluster: [
                      {
                        clusters: ['cluster1', 'cluster2'],
                        privileges: ['monitor_enrich'],
                      },
                      {
                        clusters: ['cluster3', 'cluster4'],
                        privileges: ['monitor_enrich'],
                      },
                    ],
                    metadata: undefined,
                  },
                  'existing-role': {
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
                    remote_indices: undefined,
                    metadata: undefined,
                    run_as: ['test-run-as-1', 'test-run-as-2'],
                  },
                },
              },
            ],
          },
          statusCode: 200,
          result: { updated: ['existing-role'], created: ['new-role'] },
        },
      }
    );

    postRolesTest(`notifies when sub-feature privileges are included`, {
      payload: {
        roles: {
          'role-1': {
            elasticsearch: {},
            kibana: [
              {
                spaces: ['*'],
                feature: {
                  feature_1: ['sub_feature_privilege_1'],
                },
              },
            ],
          },
          'role-2': {
            elasticsearch: {},
            kibana: [
              {
                spaces: ['*'],
                feature: {
                  feature_1: ['sub_feature_privilege_1'],
                },
              },
            ],
          },
        },
      },
      apiResponses: {
        get: () => ({}),
        post: () => ({ created: ['role-1', 'role-2'] }),
      },
      asserts: {
        recordSubFeaturePrivilegeUsage: true,
        apiArguments: {
          get: [{ name: 'role-1,role-2' }, { ignore: [404] }],
          post: [
            {
              roles: {
                'role-1': {
                  cluster: [],
                  indices: [],
                  remote_indices: undefined,
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
                'role-2': {
                  cluster: [],
                  indices: [],
                  remote_indices: undefined,
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
            },
          ],
        },
        statusCode: 200,
        result: { created: ['role-1', 'role-2'] },
      },
    });

    postRolesTest(`creates roles with everything`, {
      payload: {
        roles: {
          'role-1': {
            description: 'role 1 test description',
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
              remote_indices: [
                {
                  field_security: {
                    grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                    except: ['test-field-security-except-1', 'test-field-security-except-2'],
                  },
                  clusters: ['test-cluster-name-1', 'test-cluster-name-2'],
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
          'role-2': {
            description: 'role 2 test description',
            metadata: {
              foo: 'test-metadata',
            },
            elasticsearch: {
              cluster: ['test-cluster-privilege'],
              remote_cluster: [
                {
                  clusters: ['cluster1', 'cluster2'],
                  privileges: ['monitor_enrich'],
                },
                {
                  clusters: ['cluster3', 'cluster4'],
                  privileges: ['monitor_enrich'],
                },
              ],
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
              remote_indices: [
                {
                  field_security: {
                    grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                    except: ['test-field-security-except-1', 'test-field-security-except-2'],
                  },
                  clusters: ['test-cluster-name-1', 'test-cluster-name-2'],
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
        },
      },
      apiResponses: {
        get: () => ({}),
        post: () => ({ created: ['role-1', 'role-2'] }),
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'role-1,role-2' }, { ignore: [404] }],
          post: [
            {
              roles: {
                'role-1': {
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
                  description: 'role 1 test description',
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
                  remote_indices: [
                    {
                      field_security: {
                        grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                        except: ['test-field-security-except-1', 'test-field-security-except-2'],
                      },
                      clusters: ['test-cluster-name-1', 'test-cluster-name-2'],
                      names: ['test-index-name-1', 'test-index-name-2'],
                      privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                      query: `{ "match": { "title": "foo" } }`,
                    },
                  ],
                  metadata: { foo: 'test-metadata' },
                  run_as: ['test-run-as-1', 'test-run-as-2'],
                },
                'role-2': {
                  applications: [
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
                  remote_cluster: [
                    {
                      clusters: ['cluster1', 'cluster2'],
                      privileges: ['monitor_enrich'],
                    },
                    {
                      clusters: ['cluster3', 'cluster4'],
                      privileges: ['monitor_enrich'],
                    },
                  ],
                  description: 'role 2 test description',
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
                  remote_indices: [
                    {
                      field_security: {
                        grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                        except: ['test-field-security-except-1', 'test-field-security-except-2'],
                      },
                      clusters: ['test-cluster-name-1', 'test-cluster-name-2'],
                      names: ['test-index-name-1', 'test-index-name-2'],
                      privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                      query: `{ "match": { "title": "foo" } }`,
                    },
                  ],
                  metadata: { foo: 'test-metadata' },
                  run_as: ['test-run-as-1', 'test-run-as-2'],
                },
              },
            },
          ],
        },
        statusCode: 200,
        result: { created: ['role-1', 'role-2'] },
      },
    });

    postRolesTest(`updates roles which have existing other application privileges`, {
      payload: {
        roles: {
          'role-1': {
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
          'role-2': {
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
        },
      },
      apiResponses: {
        get: () => ({
          'role-1': {
            cluster: ['old-cluster-privilege'],
            indices: [],
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
            ],
          },
          'role-2': {
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
                application: 'beats-foo',
                privileges: ['beats-privilege'],
                resources: ['beats-resource'],
              },
            ],
          },
        }),
        post: () => ({ updated: ['role-1', 'role-2'] }),
      },
      asserts: {
        apiArguments: {
          get: [{ name: 'role-1,role-2' }, { ignore: [404] }],
          post: [
            {
              roles: {
                'role-1': {
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
                  ],
                  cluster: ['test-cluster-privilege'],
                  indices: [
                    {
                      names: ['test-index-name-1', 'test-index-name-2'],
                      privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                    },
                  ],
                  run_as: ['test-run-as-1', 'test-run-as-2'],
                },
                'role-2': {
                  applications: [
                    {
                      application,
                      privileges: ['all', 'read'],
                      resources: [GLOBAL_RESOURCE],
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
                  run_as: ['test-run-as-1', 'test-run-as-2'],
                },
              },
            },
          ],
        },
        statusCode: 200,
        result: { updated: ['role-1', 'role-2'] },
      },
    });
  });
});
