/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';
import {
  ElasticsearchClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from 'src/core/server/elasticsearch/client/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from 'src/core/server/http/router/request';
import {
  defineGetBenchmarksRoute,
  benchmarksInputSchema,
  DEFAULT_BENCHMARKS_PER_PAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  getPackagePolicies,
  getAgentPolicies,
  createBenchmarkEntry,
} from './benchmarks';

import { SavedObjectsClientContract } from 'src/core/server';
import {
  createMockAgentPolicyService,
  createPackagePolicyServiceMock,
} from '../../../../fleet/server/mocks';
import { createPackagePolicyMock } from '../../../../fleet/common/mocks';
import { AgentPolicy } from '../../../../fleet/common';

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';

export const getMockCspContext = (mockEsClient: ElasticsearchClientMock): KibanaRequest => {
  return {
    core: {
      elasticsearch: {
        client: { asCurrentUser: mockEsClient },
      },
    },
    fleet: { authz: { fleet: { all: false } } },
  } as unknown as KibanaRequest;
};

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
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineGetBenchmarksRoute(router, cspContext);

    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/api/csp/benchmarks');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineGetBenchmarksRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineGetBenchmarksRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: false } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(1);
  });

  describe('test input schema', () => {
    it('expect to find default values', async () => {
      const validatedQuery = benchmarksInputSchema.validate({});

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_BENCHMARKS_PER_PAGE,
      });
    });

    it('expect to find benchmark_name', async () => {
      const validatedQuery = benchmarksInputSchema.validate({
        benchmark_name: 'my_cis_benchmark',
      });

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_BENCHMARKS_PER_PAGE,
        benchmark_name: 'my_cis_benchmark',
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

  it('should throw when sort_field is not string', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_field: true });
    }).toThrow();
  });

  it('should not throw when sort_field is a string', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_field: 'name' });
    }).not.toThrow();
  });

  it('should throw when sort_order is not `asc` or `desc`', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_order: 'Other Direction' });
    }).toThrow();
  });

  it('should not throw when `asc` is input for sort_order field', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_order: 'asc' });
    }).not.toThrow();
  });

  it('should not throw when `desc` is input for sort_order field', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_order: 'desc' });
    }).not.toThrow();
  });

  it('should not throw when fields is a known string literal', async () => {
    expect(() => {
      benchmarksInputSchema.validate({ sort_field: 'name' });
    }).not.toThrow();
  });

  describe('test benchmarks utils', () => {
    let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      mockSoClient = savedObjectsClientMock.create();
    });

    describe('test getPackagePolicies', () => {
      it('should format request by package name', async () => {
        const mockPackagePolicyService = createPackagePolicyServiceMock();

        await getPackagePolicies(mockSoClient, mockPackagePolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_order: 'desc',
        });

        expect(mockPackagePolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
          })
        );
      });

      it('should build sort request by `sort_field` and default `sort_order`', async () => {
        const mockAgentPolicyService = createPackagePolicyServiceMock();

        await getPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_field: 'name',
          sort_order: 'desc',
        });

        expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
            sortField: 'name',
            sortOrder: 'desc',
          })
        );
      });

      it('should build sort request by `sort_field` and asc `sort_order`', async () => {
        const mockAgentPolicyService = createPackagePolicyServiceMock();

        await getPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_field: 'name',
          sort_order: 'asc',
        });

        expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
            sortField: 'name',
            sortOrder: 'asc',
          })
        );
      });
    });

    it('should format request by benchmark_name', async () => {
      const mockAgentPolicyService = createPackagePolicyServiceMock();

      await getPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
        page: 1,
        per_page: 100,
        sort_order: 'desc',
        benchmark_name: 'my_cis_benchmark',
      });

      expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
        expect.objectContaining({
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *my_cis_benchmark*`,
          page: 1,
          perPage: 100,
        })
      );
    });

    describe('test getAgentPolicies', () => {
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

    describe('test createBenchmarkEntry', () => {
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
});
