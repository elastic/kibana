/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import {
  GetHostPolicyResponse,
  HostInfo,
  HostPolicyResponse,
  HostResultList,
  HostStatus,
} from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  INGEST_API_AGENT_POLICIES,
  INGEST_API_EPM_PACKAGES,
  INGEST_API_PACKAGE_POLICIES,
} from '../../policy/store/policy_list/services/ingest';
import {
  GetAgentPoliciesResponse,
  GetPackagesResponse,
} from '../../../../../../ingest_manager/common/types/rest_spec';
import { GetPolicyListResponse } from '../../policy/types';

const generator = new EndpointDocGenerator('seed');

export const mockEndpointResultList: (options?: {
  total?: number;
  request_page_size?: number;
  request_page_index?: number;
}) => HostResultList = (options = {}) => {
  const {
    total = 1,
    request_page_size: requestPageSize = 10,
    request_page_index: requestPageIndex = 0,
  } = options;

  // Skip any that are before the page we're on
  const numberToSkip = requestPageSize * requestPageIndex;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, requestPageSize), 0);

  const hosts = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    hosts.push({
      metadata: generator.generateHostMetadata(),
      host_status: HostStatus.ERROR,
    });
  }
  const mock: HostResultList = {
    hosts,
    total,
    request_page_size: requestPageSize,
    request_page_index: requestPageIndex,
  };
  return mock;
};

/**
 * returns a mocked API response for retrieving a single host metadata
 */
export const mockEndpointDetailsApiResult = (): HostInfo => {
  return {
    metadata: generator.generateHostMetadata(),
    host_status: HostStatus.ERROR,
  };
};

/**
 * Mock API handlers used by the Endpoint Host list. It also sets up a list of
 * API handlers for Host details based on a list of Host results.
 */
const endpointListApiPathHandlerMocks = ({
  endpointsResults = mockEndpointResultList({ total: 3 }).hosts,
  epmPackages = [generator.generateEpmPackage()],
  endpointPackagePolicies = [],
  policyResponse = generator.generatePolicyResponse(),
}: {
  /** route handlers will be setup for each individual host in this array */
  endpointsResults?: HostResultList['hosts'];
  epmPackages?: GetPackagesResponse['response'];
  endpointPackagePolicies?: GetPolicyListResponse['items'];
  policyResponse?: HostPolicyResponse;
} = {}) => {
  const apiHandlers = {
    // endpoint package info
    [INGEST_API_EPM_PACKAGES]: (): GetPackagesResponse => {
      return {
        response: epmPackages,
        success: true,
      };
    },

    // endpoint list
    '/api/endpoint/metadata': (): HostResultList => {
      return {
        hosts: endpointsResults,
        request_page_size: 10,
        request_page_index: 0,
        total: endpointsResults?.length || 0,
      };
    },

    // Do policies referenced in endpoint list exist
    // just returns 1 single agent policy that includes all of the packagePolicy IDs provided
    [INGEST_API_AGENT_POLICIES]: (): GetAgentPoliciesResponse => {
      const agentPolicy = generator.generateAgentPolicy();
      (agentPolicy.package_policies as string[]).push(
        ...endpointPackagePolicies.map((packagePolicy) => packagePolicy.id)
      );
      return {
        items: [agentPolicy],
        total: 10,
        success: true,
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
        success: true,
      };
    },
  };

  // Build a GET route handler for each endpoint details based on the list of Endpoints passed on input
  if (endpointsResults) {
    endpointsResults.forEach((host) => {
      // @ts-expect-error
      apiHandlers[`/api/endpoint/metadata/${host.metadata.host.id}`] = () => host;
    });
  }

  return apiHandlers;
};

/**
 * Sets up mock impelementations in support of the Endpoints list view
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
  { endpointsResults = mockEndpointResultList({ total: 3 }).hosts, ...pathHandlersOptions } = {}
) => {
  const apiHandlers = endpointListApiPathHandlerMocks({
    ...pathHandlersOptions,
    endpointsResults,
  });

  mockedHttpService.post
    .mockImplementation(async (...args) => {
      throw new Error(`un-expected call to http.post: ${args}`);
    })
    // First time called, return list of endpoints
    .mockImplementationOnce(async () => {
      return apiHandlers['/api/endpoint/metadata']();
    });

  // If the endpoints list results is zero, then mock the second call to `/metadata` to return
  // empty list - indicating there are no endpoints currently present on the system
  if (!endpointsResults.length) {
    mockedHttpService.post.mockImplementationOnce(async () => {
      return apiHandlers['/api/endpoint/metadata']();
    });
  }

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
};
