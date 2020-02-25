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
      '@timestamp': 1542341895000,
      id: 'xDUYMHABAJk0XnHd8rrd',
      agent: {
        id: 'ced9c68e-b94a-4d66-bb4c-6106514f0a2f',
        version: '3.0.0',
      },
      event: {
        id: '2f1c0928-3876-4e11-acbb-9199257c7b1c',
        action: 'open',
      },
      file_classification: {
        malware_classification: {
          score: 3,
        },
      },
      process: {
        pid: 107,
      },
      host: {
        hostname: 'HD-c15-bc09190a',
        ip: '10.179.244.14',
        os: {
          name: 'Windows',
        },
      },
      thread: {},
      prev: null,
      next: null,
    });
  }
  const mock: AlertResultList = {
    alerts,
    total,
    request_page_size: requestPageSize,
    request_page_index: requestPageIndex,
    next: '/api/endpoint/alerts?after=1542341895000&after=2f1c0928-3876-4e11-acbb-9199257c7b1c',
    prev: '/api/endpoint/alerts?before=1542341895000&before=2f1c0928-3876-4e11-acbb-9199257c7b1c',
    result_from_index: 0,
  };
  return mock;
};
