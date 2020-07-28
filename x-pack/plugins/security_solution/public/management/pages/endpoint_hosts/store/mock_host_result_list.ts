/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpResponse, HttpStart } from 'kibana/public';
import { HostInfo, HostResultList, HostStatus } from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { INGEST_API_EPM_PACKAGES } from '../../policy/store/policy_list/services/ingest';

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
 * Mock API handlers used by the Endpoint Host list
 */
const hostListApiPathHandlerMocks = () => {
  return {
    // list
    '/api/endpoint/metadata': (
      fetchOptions?: HttpFetchOptions = {
        body: JSON.stringify({
          paging_properties: [{ page_index: 0 }, { page_size: 10 }],
        }),
      }
    ): HostResultList => {
      const params = JSON.stringify(fetchOptions.body);

      return {
        hosts: [],
        request_page_index: params.page_index,
        request_page_size: params.page_size,
        total: params.page_size,
      };
    },

    // endpoint package info
    [INGEST_API_EPM_PACKAGES]: (fetchOptions?: HttpFetchOptions) => {},

    // Do policies referenced in host list exist
    [INGEST_API_EPM_PACKAGES]: (fetchOptions?: HttpFetchOptions) => {},

    // Policy Response
    '/api/endpoint/policy_response': (fetchOptions?: HttpFetchOptions) => {},
  };
};

export const setHostListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>
): void => {
  const apiHandlers = hostListApiPathHandlerMocks();

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
