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
import {
  agentPolicyService,
  appContextService,
  licenseService,
  packagePolicyService,
} from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type { PackagePolicyClient, FleetRequestHandlerContext } from '../..';
import type { UpdatePackagePolicyRequestSchema } from '../../types/rest_spec';
import type { AgentPolicy, FleetRequestHandler } from '../../types';
import type { PackagePolicy } from '../../types';

import { getPackagePoliciesHandler } from './handlers';
import { registerRoutes } from '.';

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

function mockAgentPolicy(data: Partial<AgentPolicy>) {
  mockedAgentPolicyService.get.mockResolvedValue({
    id: 'agent-policy',
    status: 'active',
    package_policies: [],
    is_managed: false,
    namespace: 'default',
    revision: 1,
    name: 'Policy',
    updated_at: '2020-01-01',
    updated_by: 'qwerty',
    is_protected: false,
    ...data,
  });
}

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

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      get: jest.fn(),
      update: jest.fn(),
    },
  };
});

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

  describe('Update api handler', () => {
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
      jest.spyOn(licenseService, 'hasAtLeast').mockClear();
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
      (agentPolicyService.get as jest.Mock).mockResolvedValue({ inputs: [] });
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

    it('should throw if policy_ids changed on agentless integration', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValue({
        supports_agentless: true,
        inputs: [],
      });
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableReusableIntegrationPolicies: true } as any);
      const request = getUpdateKibanaRequest({ policy_ids: ['1', '2'] } as any);
      await routeHandler(context, request, response);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Cannot change agent policies of an agentless integration',
        },
      });
    });

    it('should rename the agentless agent policy to sync with the package policy name if agentless is enabled', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agent-policy',
        { name: 'Agentless policy for new-name' },
        { force: true }
      );
    });
    it('should not rename the agentless agent policy if agentless is not enabled in cloud environment', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: false },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if cloud is not enabled', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if the package policy name has not changed', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
        name: 'Agentless policy for new-name',
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if the agent policy does not support agentless', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: false,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });

    it('should disable an input if is enabled and has all its stream disabled', async () => {
      const inputs = [
        {
          type: 'input-logs',
          enabled: true,
          streams: [
            {
              enabled: false,
              data_stream: {
                type: 'logs',
                dataset: 'test.some_logs',
              },
            },
          ],
        },
      ];
      const request = getUpdateKibanaRequest({
        inputs,
      } as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          item: {
            description: 'desc',
            enabled: true,
            inputs: [
              {
                type: 'input-logs',
                enabled: false,
                streams: [
                  {
                    enabled: false,
                    data_stream: {
                      type: 'logs',
                      dataset: 'test.some_logs',
                    },
                  },
                ],
              },
            ],
            name: 'endpoint-1',
            namespace: 'default',
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.5.0',
            },
            vars: expect.any(Object),
            policy_id: '2',
          },
        },
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
