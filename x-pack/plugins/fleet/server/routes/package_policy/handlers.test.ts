/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { RouteConfig } from '@kbn/core/server';

import type { FleetAuthzRouter } from '../../services/security';

import { PACKAGE_POLICY_API_ROUTES } from '../../../common/constants';
import { appContextService, packagePolicyService } from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type { PackagePolicyClient, FleetRequestHandlerContext } from '../..';
import type {
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
} from '../../types/rest_spec';
import type { FleetRequestHandler } from '../../types';
import type { PackagePolicy } from '../../types';

import { createPackagePolicyHandler, getPackagePoliciesHandler } from './handlers';

import { registerRoutes } from '.';

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;

jest.mock(
  '../../services/package_policy',
  (): {
    packagePolicyService: jest.Mocked<PackagePolicyClient>;
  } => {
    return {
      packagePolicyService: {
        _compilePackagePolicyInputs: jest.fn((packageInfo, vars, dataInputs) =>
          Promise.resolve(dataInputs)
        ),
        buildPackagePolicyFromPackage: jest.fn(),
        bulkCreate: jest.fn(),
        create: jest.fn((soClient, esClient, newData) =>
          Promise.resolve({
            ...newData,
            inputs: newData.inputs.map((input) => ({
              ...input,
              streams: input.streams.map((stream) => ({
                id: stream.data_stream.dataset,
                ...stream,
              })),
            })),
            id: '1',
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'elastic',
            created_at: new Date().toISOString(),
            created_by: 'elastic',
          })
        ),
        delete: jest.fn(),
        get: jest.fn(),
        getByIDs: jest.fn(),
        list: jest.fn(async (_, __) => {
          return {
            total: 1,
            perPage: 10,
            page: 1,
            items: [
              {
                id: `123`,
                name: `Package Policy 123`,
                description: '',
                created_at: '2022-12-19T20:43:45.879Z',
                created_by: 'elastic',
                updated_at: '2022-12-19T20:43:45.879Z',
                updated_by: 'elastic',
                policy_id: `agent-policy-id-a`,
                policy_ids: [`agent-policy-id-a`],
                enabled: true,
                inputs: [],
                namespace: 'default',
                package: {
                  name: 'a-package',
                  title: 'package A',
                  version: '1.0.0',
                },
                revision: 1,
              },
            ],
          };
        }),
        listIds: jest.fn(),
        update: jest.fn(),
        // @ts-ignore
        runExternalCallbacks: jest.fn((callbackType, packagePolicy, context, request) =>
          callbackType === 'packagePolicyPostDelete'
            ? Promise.resolve(undefined)
            : Promise.resolve(packagePolicy)
        ),
        upgrade: jest.fn(),
        getUpgradeDryRunDiff: jest.fn(),
        enrichPolicyWithDefaultsFromPackage: jest
          .fn()
          .mockImplementation((soClient, newPolicy) => newPolicy),
      },
    };
  }
);

jest.mock('../../services/epm/packages', () => {
  return {
    ensureInstalledPackage: jest.fn(() => Promise.resolve()),
    getPackageInfo: jest.fn(() => Promise.resolve()),
    getInstallation: jest.fn(),
  };
});

describe('When calling package policy', () => {
  let routerMock: jest.Mocked<FleetAuthzRouter>;
  let routeHandler: FleetRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter() as unknown as jest.Mocked<FleetAuthzRouter>;
    registerRoutes(routerMock);
  });

  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>;
    response = httpServerMock.createResponseFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('create api handler', () => {
    const getCreateKibanaRequest = (
      newData?: typeof CreatePackagePolicyRequestSchema.body
    ): KibanaRequest<
      undefined,
      typeof CreatePackagePolicyRequestSchema.query,
      typeof CreatePackagePolicyRequestSchema.body
    > => {
      return httpServerMock.createKibanaRequest<
        undefined,
        typeof CreatePackagePolicyRequestSchema.query,
        typeof CreatePackagePolicyRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'post',
        body: newData || {},
        query: { format: 'simplified' },
      });
    };

    const newPolicy = {
      name: 'endpoint-1',
      description: 'desc',
      enabled: true,
      policy_ids: [],
      inputs: [],
      namespace: 'default',
      package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.5.0' },
    };

    beforeEach(() => {
      // @ts-ignore
      const postMock = routerMock.versioned.post.mock;
      // @ts-ignore
      routeConfig = postMock.calls.find(([{ path }]) =>
        path.startsWith(PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN)
      )!;
      routeHandler = postMock.results[0].value.addVersion.mock.calls[0][1];
    });

    it('should throw if no policy_id or policy_ids is provided', async () => {
      const request = getCreateKibanaRequest(newPolicy as any);
      await createPackagePolicyHandler(context, request as any, response);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Either policy_id or policy_ids must be provided',
        },
      });
    });
  });

  describe('update api handler', () => {
    const getUpdateKibanaRequest = (
      newData?: typeof UpdatePackagePolicyRequestSchema.body
    ): KibanaRequest<
      typeof UpdatePackagePolicyRequestSchema.params,
      undefined,
      typeof UpdatePackagePolicyRequestSchema.body
    > => {
      return httpServerMock.createKibanaRequest<
        typeof UpdatePackagePolicyRequestSchema.params,
        undefined,
        typeof UpdatePackagePolicyRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'put',
        params: { packagePolicyId: '1' },
        body: newData || {},
      });
    };

    const existingPolicy = {
      name: 'endpoint-1',
      description: 'desc',
      policy_id: '2',
      enabled: true,
      inputs: [
        {
          type: 'logfile',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'apache.access',
              },
              id: '1',
            },
          ],
        },
      ],
      namespace: 'default',
      package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.5.0' },
      vars: {
        paths: {
          value: ['/var/log/apache2/access.log*'],
          type: 'text',
        },
      },
    };

    beforeEach(() => {
      // @ts-ignore
      const putMock = routerMock.versioned.put.mock;
      // @ts-ignore
      routeConfig = putMock.calls.find(([{ path }]) =>
        path.startsWith(PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN)
      )!;
      routeHandler = putMock.results[0].value.addVersion.mock.calls[0][1];
    });

    beforeEach(() => {
      packagePolicyServiceMock.update.mockImplementation((soClient, esClient, policyId, newData) =>
        Promise.resolve(newData as PackagePolicy)
      );
      packagePolicyServiceMock.get.mockResolvedValue({
        id: '1',
        revision: 1,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
        ...existingPolicy,
        policy_ids: [existingPolicy.policy_id],
        inputs: [
          {
            ...existingPolicy.inputs[0],
            compiled_input: '',
            streams: [
              {
                ...existingPolicy.inputs[0].streams[0],
                compiled_stream: {},
              },
            ],
          },
        ],
      });
    });

    it('should use existing package policy props if not provided by request', async () => {
      const request = getUpdateKibanaRequest();
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: existingPolicy },
      });
    });

    it('should use request package policy props if provided by request', async () => {
      const newData = {
        name: 'endpoint-2',
        description: '',
        policy_id: '3',
        policy_ids: ['3'],
        enabled: false,
        inputs: [
          {
            type: 'metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'apache.access',
                },
                id: '1',
              },
            ],
          },
        ],
        namespace: 'namespace',
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: newData },
      });
    });

    it('should override props provided by request only', async () => {
      const newData = {
        namespace: 'namespace',
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: { ...existingPolicy, namespace: 'namespace' } },
      });
    });
  });

  describe('list api handler', () => {
    it('should return agent count when `withAgentCount` query param is used', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: {
          withAgentCount: true,
        },
      });
      (
        (await context.core).elasticsearch.client.asInternalUser.search as jest.Mock
      ).mockImplementation(() => {
        return {
          took: 3,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 100,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            agent_counts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'agent-policy-id-a',
                  doc_count: 100,
                },
              ],
            },
          },
        };
      });

      await getPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          page: 1,
          perPage: 10,
          total: 1,
          items: [
            {
              agents: 100,
              created_at: '2022-12-19T20:43:45.879Z',
              created_by: 'elastic',
              description: '',
              enabled: true,
              id: '123',
              inputs: [],
              name: 'Package Policy 123',
              namespace: 'default',
              package: {
                name: 'a-package',
                title: 'package A',
                version: '1.0.0',
              },
              policy_id: 'agent-policy-id-a',
              policy_ids: ['agent-policy-id-a'],
              revision: 1,
              updated_at: '2022-12-19T20:43:45.879Z',
              updated_by: 'elastic',
            },
          ],
        },
      });
    });
  });
});
