/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointResultList } from '../../../../../common/types';

export const mockHostResultList: (options?: {
  total?: number;
  request_page_size?: number;
  request_page_index?: number;
}) => EndpointResultList = (options = {}) => {
  const {
    total = 1,
    request_page_size: requestPageSize = 10,
    request_page_index: requestPageIndex = 0,
  } = options;

  // Skip any that are before the page we're on
  const numberToSkip = requestPageSize * requestPageIndex;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, requestPageSize), 0);

  const endpoints = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    endpoints.push({
      '@timestamp': new Date(1582231151055).toString(),
      event: {
        created: new Date('2020-02-20T20:39:11.055Z'),
      },
      endpoint: {
        policy: {
          id: '00000000-0000-0000-0000-000000000000',
        },
      },
      agent: {
        version: '6.9.2',
        id: '9a87fdac-e6c0-4f27-a25c-e349e7093cb1',
      },
      host: {
        id: '3ca26fe5-1c7d-42b8-8763-98256d161c9f',
        hostname: 'bea-0.example.com',
        ip: ['10.154.150.114', '10.43.37.62', '10.217.73.149'],
        mac: ['ea-5a-a8-c0-5-95', '7e-d8-fe-7f-b6-4e', '23-31-5d-af-e6-2b'],
        os: {
          name: 'windows 6.2',
          full: 'Windows Server 2012',
          version: '6.2',
          variant: 'Windows Server Release 2',
        },
      },
    });
  }
  const mock: EndpointResultList = {
    endpoints,
    total,
    request_page_size: requestPageSize,
    request_page_index: requestPageIndex,
  };
  return mock;
};
