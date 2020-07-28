/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import {
  HostInfo,
  HostPolicyResponse,
  HostResultList,
  HostStatus,
} from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  INGEST_API_AGENT_CONFIGS,
  INGEST_API_EPM_PACKAGES,
  INGEST_API_PACKAGE_CONFIGS,
} from '../../policy/store/policy_list/services/ingest';
import {
  GetAgentConfigsResponse,
  GetPackagesResponse,
} from '../../../../../../ingest_manager/common/types/rest_spec';
import { mockPolicyResultList } from '../../policy/store/policy_list/test_mock_utils';
import { GetPolicyListResponse } from '../../policy/types';

const generator = new EndpointDocGenerator('seed');

export const mockHostResultList: (options?: {
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
export const mockHostDetailsApiResult = (): HostInfo => {
  return {
    metadata: generator.generateHostMetadata(),
    host_status: HostStatus.ERROR,
  };
};

/**
 * Mock API handlers used by the Endpoint Host list. It also provides a list of
 * API GET requests for Host details based on a list of Host results.
 */
const hostListApiPathHandlerMocks = ({
  hostsResults = mockHostResultList({ total: 3 }).hosts,
  epmPackages = [generator.generateEpmPackage()],
  ingestPackageConfigs = mockPolicyResultList({ total: 0 }).items,
  policyResponse = generator.generatePolicyResponse(),
}: {
  hostsResults?: HostResultList['hosts'];
  epmPackages?: GetPackagesResponse['response'];
  ingestPackageConfigs?: GetPolicyListResponse['items'];
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

    // Do policies referenced in host list exist
    // just returns 1 single agent config that includes all of the packageConfig IDs provided
    [INGEST_API_AGENT_CONFIGS]: (): GetAgentConfigsResponse => {
      const agentConfig = generator.generateAgentConfig();
      (agentConfig.package_configs as string[]).push(
        ...ingestPackageConfigs.map((packageConfig) => packageConfig.id)
      );
      return {
        items: [agentConfig],
        total: 10,
        success: true,
        perPage: 10,
        page: 1,
      };
    },

    // Policy Response
    '/api/endpoint/policy_response': () => {
      return policyResponse;
    },

    // List of Policies (package configs) for onboarding
    [INGEST_API_PACKAGE_CONFIGS]: (): GetPolicyListResponse => {
      return {
        items: ingestPackageConfigs,
        page: 1,
        perPage: 10,
        total: ingestPackageConfigs?.length,
        success: true,
      };
    },
  };

  // Build a GET route handler for each host details based on the list of Hosts passed on input
  if (hostsResults) {
    hostsResults.forEach((host) => {
      apiHandlers[`/api/endpoint/metadata/${host.metadata.host.id}`] = () => host;
    });
  }

  return apiHandlers;
};

export const setHostListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  {
    hostsResults = mockHostResultList({ total: 3 }).hosts,
    ...pathHandlersOptions
  }: Parameters<typeof hostListApiPathHandlerMocks>[0] & {
    hostsResults?: HostResultList['hosts'];
  } = {}
): void => {
  const apiHandlers = hostListApiPathHandlerMocks(pathHandlersOptions);
  const hostApiResponse: HostResultList = {
    hosts: hostsResults,
    request_page_size: 10,
    request_page_index: 0,
    total: hostsResults?.length,
  };
  mockedHttpService.post
    .mockImplementation(async (...args) => {
      throw new Error(`un-expected call to http.post: ${args}`);
    })
    // First time called, return list of hosts
    .mockResolvedValueOnce(hostApiResponse);

  // If the hosts list results is zero, then mock the second call to `/metadata` to return
  // empty list - indicating there are no hosts currently present on the system
  if (!hostsResults.length) {
    mockedHttpService.post.mockResolvedValueOnce(hostApiResponse);
  }

  mockedHttpService.get.mockImplementation(async (...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (apiHandlers[path]) {
        return apiHandlers[path]();
      }
    }

    throw new Error(`MOCK: unknown api request: ${path}`);
  });
};
