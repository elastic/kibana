/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  BulkGetPackagePoliciesResponse,
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
  GetAgentsResponse,
  GetPackagesResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec';
import type {
  GetHostPolicyResponse,
  HostInfo,
  HostPolicyResponse,
  MetadataListResponse,
  PendingActionsResponse,
} from '../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  INGEST_API_AGENT_POLICIES,
  INGEST_API_EPM_PACKAGES,
  INGEST_API_FLEET_AGENTS,
  INGEST_API_PACKAGE_POLICIES,
} from '../../../services/policies/ingest';
import type { GetPolicyListResponse } from '../../policy/types';
import { pendingActionsResponseMock } from '../../../../common/lib/endpoint_pending_actions/mocks';
import {
  ACTION_STATUS_ROUTE,
  ENDPOINT_DEFAULT_SORT_DIRECTION,
  ENDPOINT_DEFAULT_SORT_FIELD,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
} from '../../../../../common/endpoint/constants';
import type { TransformStats, TransformStatsResponse } from '../types';

const generator = new EndpointDocGenerator('seed');

export const mockEndpointResultList: (options?: {
  total?: number;
  page?: number;
  pageSize?: number;
}) => MetadataListResponse = (options = {}) => {
  const { total = 1, page = 0, pageSize = 10 } = options;

  // Skip any that are before the page we're on
  const numberToSkip = pageSize * page;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, pageSize), 0);

  const hosts: HostInfo[] = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    const newDate = new Date();
    const metadata = generator.generateHostMetadata(newDate.getTime());
    hosts.push({
      metadata,
      host_status: HostStatus.UNHEALTHY,
      last_checkin: newDate.toISOString(),
    });
  }
  const mock: MetadataListResponse = {
    data: hosts,
    total,
    page,
    pageSize,
    sortDirection: ENDPOINT_DEFAULT_SORT_DIRECTION,
    sortField: ENDPOINT_DEFAULT_SORT_FIELD,
  };
  return mock;
};

/**
 * returns a mocked API response for retrieving a single host metadata
 */
export const mockEndpointDetailsApiResult = (): HostInfo => {
  const newDate = new Date();
  const metadata = generator.generateHostMetadata(newDate.getTime());
  return {
    metadata,
    host_status: HostStatus.UNHEALTHY,
    last_checkin: newDate.toISOString(),
  };
};

/**
 * Mock API handlers used by the Endpoint Host list. It also sets up a list of
 * API handlers for Host details based on a list of Host results.
 */
const endpointListApiPathHandlerMocks = ({
  endpointsResults = mockEndpointResultList({ total: 3 }).data,
  epmPackages = [generator.generateEpmPackage()],
  endpointPackagePolicies = [],
  policyResponse = generator.generatePolicyResponse(),
  agentPolicy = generator.generateAgentPolicy(),
  totalAgentsUsingEndpoint = 0,
  transforms = [],
}: {
  /** route handlers will be setup for each individual host in this array */
  endpointsResults?: MetadataListResponse['data'];
  epmPackages?: GetPackagesResponse['items'];
  endpointPackagePolicies?: GetPolicyListResponse['items'];
  policyResponse?: HostPolicyResponse;
  agentPolicy?: GetAgentPoliciesResponseItem;
  totalAgentsUsingEndpoint?: number;
  transforms?: TransformStats[];
} = {}) => {
  const apiHandlers = {
    // endpoint package info
    [INGEST_API_EPM_PACKAGES]: (): GetPackagesResponse => {
      return {
        items: epmPackages,
      };
    },

    // endpoint list
    [HOST_METADATA_LIST_ROUTE]: (): MetadataListResponse => {
      return {
        data: endpointsResults,
        total: endpointsResults?.length || 0,
        page: 0,
        pageSize: 10,
        sortDirection: ENDPOINT_DEFAULT_SORT_DIRECTION,
        sortField: ENDPOINT_DEFAULT_SORT_FIELD,
      };
    },

    // Do policies reference in endpoint list exist
    // just returns 1 single agent policy that includes all the packagePolicy IDs provided
    [INGEST_API_AGENT_POLICIES]: (): GetAgentPoliciesResponse => {
      return {
        items: [agentPolicy],
        total: 10,
        perPage: 10,
        page: 1,
      };
    },

    // Policy Response
    '/api/endpoint/policy_response': (): GetHostPolicyResponse => {
      return { policy_response: policyResponse };
    },

    // List of Policies (package policies) for onboarding
    [INGEST_API_PACKAGE_POLICIES]: (): GetPolicyListResponse => {
      return {
        items: endpointPackagePolicies,
        page: 1,
        perPage: 10,
        total: endpointPackagePolicies?.length,
      };
    },

    // List of Policies (package policies) for onboarding
    [`${INGEST_API_PACKAGE_POLICIES}/_bulk_get`]: (): BulkGetPackagePoliciesResponse => {
      return {
        items: endpointPackagePolicies,
      };
    },

    // List of Agents using Endpoint
    [INGEST_API_FLEET_AGENTS]: (): GetAgentsResponse => {
      return {
        total: totalAgentsUsingEndpoint,
        items: [],
        page: 1,
        perPage: 10,
      };
    },

    // Pending Actions
    [ACTION_STATUS_ROUTE]: (): PendingActionsResponse => {
      return pendingActionsResponseMock();
    },

    [METADATA_TRANSFORMS_STATUS_ROUTE]: (): TransformStatsResponse => ({
      count: transforms.length,
      transforms,
    }),
  };

  // Build a GET route handler for each endpoint details based on the list of Endpoints passed on input
  if (endpointsResults) {
    endpointsResults.forEach((host) => {
      // @ts-expect-error
      apiHandlers[`${HOST_METADATA_LIST_ROUTE}/${host.metadata.agent.id}`] = () => host;
    });
  }

  return apiHandlers;
};

/**
 * Sets up mock implementations in support of the Endpoints list view
 *
 * @param mockedHttpService
 * @param endpointsResults
 * @param pathHandlersOptions
 */
export const setEndpointListApiMockImplementation: (
  mockedHttpService: jest.Mocked<HttpStart>,
  apiResponses?: Parameters<typeof endpointListApiPathHandlerMocks>[0]
) => void = (
  mockedHttpService,
  { endpointsResults = mockEndpointResultList({ total: 3 }).data, ...pathHandlersOptions } = {}
) => {
  const apiHandlers = endpointListApiPathHandlerMocks({
    ...pathHandlersOptions,
    endpointsResults,
  });

  // Setup handling of GET requests
  mockedHttpService.get.mockImplementation(async (...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (apiHandlers[path]) {
        return apiHandlers[path]();
      }
    }

    throw new Error(`MOCK: api request does not have a mocked handler: ${path}`);
  });

  mockedHttpService.post.mockImplementation(async (...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (apiHandlers[path]) {
        return apiHandlers[path]();
      }
    }

    throw new Error(`MOCK: api request does not have a mocked handler: ${path}`);
  });
};
