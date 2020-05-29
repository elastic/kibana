/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostInfo, HostResultList, HostStatus } from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';

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
    const generator = new EndpointDocGenerator('seed');
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
  const generator = new EndpointDocGenerator('seed');
  return {
    metadata: generator.generateHostMetadata(),
    host_status: HostStatus.ERROR,
  };
};
