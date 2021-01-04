/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateRecordApiParams,
  ExecutorSubActionCreateRecordParams,
  ExternalService,
} from './types';

const createMock = (): jest.Mocked<ExternalService> => {
  return {
    createRecord: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '123456',
      })
    ),
  };
};

const externalServiceMock = {
  create: createMock,
};

const executorParams: ExecutorSubActionCreateRecordParams = {
  alertName: 'alert-name',
  alertSource: 'alert-source',
  caseId: 'case-id',
  caseName: 'case-name',
  comments: 'comments',
  severity: 'severity',
};

const apiParams: CreateRecordApiParams = {
  ...executorParams,
};

export { externalServiceMock, executorParams, apiParams };
