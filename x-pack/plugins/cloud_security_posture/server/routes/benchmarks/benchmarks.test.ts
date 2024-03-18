/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock, httpServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  benchmarksQueryParamsSchema,
  DEFAULT_BENCHMARKS_PER_PAGE,
} from '../../../common/types/benchmarks/v1';
import { getCspAgentPolicies } from '../../lib/fleet_util';
import { defineGetBenchmarksRoute } from './benchmarks';
import { getRulesCountForPolicy } from './utilities';
import { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { createMockAgentPolicyService } from '@kbn/fleet-plugin/server/mocks';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { createCspRequestHandlerContextMock } from '../../mocks';

describe('benchmarks API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();

    defineGetBenchmarksRoute(router);

    const [config] = router.versioned.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/benchmarks');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineGetBenchmarksRoute(router);

    const versionedRouter = router.versioned.get.mock.results[0].value;

    const handler = versionedRouter.addVersion.mock.calls[0][1];

    const mockContext = createCspRequestHandlerContextMock();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineGetBenchmarksRoute(router);

    const versionedRouter = router.versioned.get.mock.results[0].value;
    const handler = versionedRouter.addVersion.mock.calls[0][1];

    const mockContext = createCspRequestHandlerContextMock();
    mockContext.fleet.authz.fleet.all = false;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(1);
  });

  describe('test input schema', () => {
    it('expect to find default values', async () => {
      const validatedQuery = benchmarksQueryParamsSchema.validate({});

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_BENCHMARKS_PER_PAGE,
      });
    });

    it('expect to find package_policy_name', async () => {
      const validatedQuery = benchmarksQueryParamsSchema.validate({
        package_policy_name: 'my_cis_benchmark',
      });

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_BENCHMARKS_PER_PAGE,
        package_policy_name: 'my_cis_benchmark',
      });
    });

    it('should throw when page field is not a positive integer', async () => {
      expect(() => {
        benchmarksQueryParamsSchema.validate({ page: -2 });
      }).toThrow();
    });

    it('should throw when per_page field is not a positive integer', async () => {
      expect(() => {
        benchmarksQueryParamsSchema.validate({ per_page: -2 });
      }).toThrow();
    });
  });

  it('should throw when sort_field is not string', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_field: true });
    }).toThrow();
  });

  it('should not throw when sort_field is a string', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_field: 'package_policy.name' });
    }).not.toThrow();
  });

  it('should throw when sort_order is not `asc` or `desc`', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_order: 'Other Direction' });
    }).toThrow();
  });

  it('should not throw when `asc` is input for sort_order field', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_order: 'asc' });
    }).not.toThrow();
  });

  it('should not throw when `desc` is input for sort_order field', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_order: 'desc' });
    }).not.toThrow();
  });

  it('should not throw when fields is a known string literal', async () => {
    expect(() => {
      benchmarksQueryParamsSchema.validate({ sort_field: 'package_policy.name' });
    }).not.toThrow();
  });

  describe('test benchmarks utils', () => {
    let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      mockSoClient = savedObjectsClientMock.create();
    });

    describe('test getAgentPolicies', () => {
      it('should return one agent policy id when there is duplication', async () => {
        const agentPolicyService = createMockAgentPolicyService();
        const packagePolicies = [createPackagePolicyMock(), createPackagePolicyMock()];

        await getCspAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

        expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(1);
      });

      it('should return full policy ids list when there is no id duplication', async () => {
        const agentPolicyService = createMockAgentPolicyService();

        const packagePolicy1 = createPackagePolicyMock();
        const packagePolicy2 = createPackagePolicyMock();
        packagePolicy2.policy_id = 'AnotherId';
        const packagePolicies = [packagePolicy1, packagePolicy2];

        await getCspAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

        expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(2);
      });
    });

    describe('test addPackagePolicyCspBenchmarkRule', () => {
      it('should retrieve the rules count by the filtered benchmark type', async () => {
        const benchmark = 'cis_k8s';
        mockSoClient.find.mockResolvedValueOnce({
          aggregations: { enabled_status: { doc_count: 2 } },
          page: 1,
          per_page: 10000,
          total: 3,
          saved_objects: [
            {
              type: 'csp_rule',
              id: '0af387d0-c933-11ec-b6c8-4f8afc058cc3',
            },
          ],
        } as unknown as SavedObjectsFindResponse);

        const rulesCount = await getRulesCountForPolicy(mockSoClient, benchmark);

        const expectedFilter = `csp-rule-template.attributes.metadata.benchmark.id: "${benchmark}"`;
        expect(mockSoClient.find.mock.calls[0][0].filter).toEqual(expectedFilter);
        expect(rulesCount).toEqual(3);
      });
    });
  });
});
