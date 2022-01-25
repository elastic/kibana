/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock, loggingSystemMock, savedObjectsClientMock } from 'src/core/server/mocks';
import {
  defineGetBenchmarksRoute,
  benchmarksInputSchema,
  DEFAULT_BENCHMARKS_PER_PAGE,
  getPackagePolicies,
  getAgentPolicies,
  addRunningAgentToAgentPolicy,
  createBenchmarkEntry,
} from './benchmarks';
import { CoreSetup, SavedObjectsClientContract } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import {
  createMockAgentPolicyService,
  createMockAgentService,
  createPackagePolicyServiceMock,
} from '../../../../fleet/server/mocks';
import { createPackagePolicyMock } from '../../../../fleet/common/mocks';
import { AgentPolicy } from '../../../../fleet/common';

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { CspServerPluginStart, CspServerPluginStartDeps } from '../../types';

function createMockAgentPolicy(props: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    id: 'some-uuid1',
    namespace: 'default',
    monitoring_enabled: [],
    name: 'Test Policy',
    description: '',
    is_default: false,
    is_preconfigured: false,
    status: 'active',
    is_managed: false,
    revision: 1,
    updated_at: '',
    updated_by: 'elastic',
    package_policies: [],
    ...props,
  };
}
describe('benchmarks API', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();
    const coreSetup = coreMock.createSetup() as CoreSetup<
      CspServerPluginStartDeps,
      CspServerPluginStart
    >;
    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
      getStartServices: coreSetup.getStartServices,
    };
    defineGetBenchmarksRoute(router, cspContext);

    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/api/csp/benchmarks');
  });
});

describe('test input schema', () => {
  it('expect to find default values', async () => {
    const validatedQuery = benchmarksInputSchema.validate({});

    expect(validatedQuery).toMatchObject({
      page: 1,
      per_page: DEFAULT_BENCHMARKS_PER_PAGE,
    });
  });

  it('should throw when page field is not a positive integer', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ page: -2 });
    }).toThrow();
  });

  it('should throw when per_page field is not a positive integer', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ per_page: -2 });
    }).toThrow();
  });
});
describe('test benchmarks utils', () => {
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockSoClient = savedObjectsClientMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('test getPackagePolicies', () => {
    it('should throw when agentPolicyService is undefined', async () => {
      const mockAgentPolicyService = undefined;
      expect(
        getPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
        })
      ).rejects.toThrow();
    });

    it('should format request by package name', async () => {
      const mockAgentPolicyService = createPackagePolicyServiceMock();

      await getPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
        page: 1,
        per_page: 100,
      });

      expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
        expect.objectContaining({
          kuery: 'ingest-package-policies.package.name:myPackage',
          page: 1,
          perPage: 100,
        })
      );
    });
  });

  describe('test getAgentPolicies', () => {
    it('should throw when agentPolicyService is undefined', async () => {
      const agentPolicyService = undefined;
      expect(getAgentPolicies(mockSoClient, [], agentPolicyService)).rejects.toThrow();
    });

    it('should return one agent policy id when there is duplication', async () => {
      const agentPolicyService = createMockAgentPolicyService();
      const packagePolicies = [createPackagePolicyMock(), createPackagePolicyMock()];

      await getAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

      expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(1);
    });

    it('should return full policy ids list when there is no id duplication', async () => {
      const agentPolicyService = createMockAgentPolicyService();

      const packagePolicy1 = createPackagePolicyMock();
      const packagePolicy2 = createPackagePolicyMock();
      packagePolicy2.policy_id = 'AnotherId';
      const packagePolicies = [packagePolicy1, packagePolicy2];

      await getAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

      expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(2);
    });
  });

  describe('test addRunningAgentsToAgentPolicy', () => {
    it('should throw when agentService is undefined', async () => {
      const agentService = undefined;

      const agentPolicies = [createMockAgentPolicy(), createMockAgentPolicy()];

      expect(addRunningAgentToAgentPolicy(agentService, agentPolicies)).rejects.toThrow();
    });

    it('should return empty array when agentPolicies is undefined', async () => {
      const agentService = createMockAgentService();
      const agentPolicies = undefined;

      const enrichAgentPolicy = await addRunningAgentToAgentPolicy(agentService, agentPolicies);

      expect(enrichAgentPolicy).toMatchObject([]);
    });
  });

  describe('test createBenchmarkEntry', () => {
    it('should throw when agentService is undefined', async () => {
      const agentService = undefined;

      const agentPolicies = [createMockAgentPolicy(), createMockAgentPolicy()];

      expect(addRunningAgentToAgentPolicy(agentService, agentPolicies)).rejects.toThrow();
    });

    it('should build benchmark entry agent policy and package policy', async () => {
      const packagePolicy = createPackagePolicyMock();
      const agentPolicy = createMockAgentPolicy();
      // @ts-expect-error
      agentPolicy.agents = 3;

      const enrichAgentPolicy = await createBenchmarkEntry(agentPolicy, packagePolicy);

      expect(enrichAgentPolicy).toMatchObject({
        package_policy: {
          id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
          name: 'endpoint-1',
          policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
          namespace: 'default',
          updated_at: '2020-06-25T16:03:38.159292',
          updated_by: 'kibana',
          created_at: '2020-06-25T16:03:38.159292',
          created_by: 'kibana',
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
        },
        agent_policy: { id: 'some-uuid1', name: 'Test Policy', agents: 3 },
      });
    });
  });
});
