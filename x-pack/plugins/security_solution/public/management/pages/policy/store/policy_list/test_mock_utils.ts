/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import {
  INGEST_API_AGENT_CONFIGS,
  INGEST_API_EPM_PACKAGES,
  INGEST_API_PACKAGE_CONFIGS,
} from './services/ingest';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { GetPolicyListResponse } from '../../types';
import {
  GetAgentConfigsResponse,
  GetPackagesResponse,
} from '../../../../../../../ingest_manager/common';

const generator = new EndpointDocGenerator('policy-list');

/**
 * It sets the mock implementation on the necessary http methods to support the policy list view
 * @param mockedHttpService
 * @param totalPolicies
 */
export const setPolicyListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  totalPolicies: number = 1
): void => {
  const policyApiHandlers = policyListApiPathHandlers(totalPolicies);

  mockedHttpService.get.mockImplementation(async (...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (policyApiHandlers[path]) {
        return policyApiHandlers[path]();
      }
    }
    return Promise.reject(new Error(`MOCK: unknown policy list api: ${path}`));
  });
};

/**
 * Returns the response body for a call to get the list of Policies
 * @param options
 */
export const mockPolicyResultList: (options?: {
  total?: number;
  request_page_size?: number;
  request_page_index?: number;
}) => GetPolicyListResponse = (options = {}) => {
  const {
    total = 1,
    request_page_size: requestPageSize = 10,
    request_page_index: requestPageIndex = 0,
  } = options;

  // Skip any that are before the page we're on
  const numberToSkip = requestPageSize * requestPageIndex;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, requestPageSize), 0);

  const policies = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    policies.push(generator.generatePolicyPackageConfig());
  }
  const mock: GetPolicyListResponse = {
    items: policies,
    total,
    page: requestPageIndex,
    perPage: requestPageSize,
    success: true,
  };
  return mock;
};

/**
 * Returns an object comprised of the API path as the key along with a function that
 * returns that API's result value
 */
export const policyListApiPathHandlers = (totalPolicies: number = 1) => {
  let lastResponseForPolicyResultList: undefined | GetPolicyListResponse;

  return {
    [INGEST_API_PACKAGE_CONFIGS]: () => {
      return (lastResponseForPolicyResultList = mockPolicyResultList({ total: totalPolicies }));
    },
    /**
     * Returns the list of agent configuration with IDs that were also included in the call to
     * Policy Package Configs API
     */
    [INGEST_API_AGENT_CONFIGS]: (): GetAgentConfigsResponse => {
      const items = lastResponseForPolicyResultList
        ? lastResponseForPolicyResultList.items.map((policy) => {
            const agentConfig = generator.generateAgentConfig();
            agentConfig.id = policy.config_id;
            return agentConfig;
          })
        : [generator.generateAgentConfig()];
      return {
        items,
        page: 1,
        perPage: 10,
        success: true,
        total: items.length,
      };
    },
    [INGEST_API_EPM_PACKAGES]: (): GetPackagesResponse => {
      return {
        response: [generator.generateEpmPackage()],
        success: true,
      };
    },
  };
};
