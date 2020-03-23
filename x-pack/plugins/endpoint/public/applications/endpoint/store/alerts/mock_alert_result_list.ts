/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertResultList, AlertDetails } from '../../../../../common/types';
import { EndpointDocGenerator } from '../../../../../common/generate_data';

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
  const generator = new EndpointDocGenerator();
  for (let index = 0; index < actualCountToReturn; index++) {
    alerts.push({
      ...generator.generateAlert(new Date().getTime() + index * 1000),
      ...{
        id: 'xDUYMHABAJk0XnHd8rrd' + index,
        prev: null,
        next: null,
      },
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

export const mockAlertDetailsResult = (): AlertDetails => {
  const generator = new EndpointDocGenerator();
  return {
    ...generator.generateAlert(new Date().getTime()),
    ...{
      id: 'xDUYMHABAKk0XnHd8rrd',
      prev: null,
      next: null,
      state: {
        host: generator.generateHostMetadata(),
      },
    },
  };
};
