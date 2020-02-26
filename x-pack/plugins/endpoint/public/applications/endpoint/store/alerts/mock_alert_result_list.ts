/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertResultList } from '../../../../../common/types';

export const mockAlertResultList: (options?: {
  total?: number;
  request_page_size?: number;
  request_page_index?: number;
}) => AlertResultList = (options = {}) => {
  const {
    total = 1,
    request_page_size: requestPageSize = 10,
    request_page_index: requestPageIndex = 0,
  } = options;

  // Skip any that are before the page we're on
  const numberToSkip = requestPageSize * requestPageIndex;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, requestPageSize), 0);

  const alerts = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    alerts.push({
      '@timestamp': new Date(1542341895000).toString(),
      agent: {
        id: 'ced9c68e-b94a-4d66-bb4c-6106514f0a2f',
        version: '3.0.0',
      },
      event: {
        action: 'open',
      },
      file_classification: {
        malware_classification: {
          score: 3,
        },
      },
      host: {
        hostname: 'HD-c15-bc09190a',
        ip: '10.179.244.14',
        os: {
          name: 'Windows',
        },
      },
      thread: {},
    });
  }
  const mock: AlertResultList = {
    alerts,
    total,
    request_page_size: requestPageSize,
    request_page_index: requestPageIndex,
    result_from_index: 0,
  };
  return mock;
};
