/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../../common/constants';
import { requestMock } from './server';

export const getReadRequest = () =>
  requestMock.create({
    method: 'get',
    path: BASE_RAC_ALERTS_API_PATH,
    query: { id: 'alert-1' },
  });

export const getUpdateRequest = () =>
  requestMock.create({
    method: 'patch',
    path: BASE_RAC_ALERTS_API_PATH,
    body: {
      status: 'closed',
      ids: ['alert-1'],
      indexName: '.alerts-observability-apm*',
    },
  });
