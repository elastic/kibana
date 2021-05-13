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

export const recordResponseCreate = {
  id: '123456',
  title: 'neato',
  url: 'swimlane.com',
};
export const recordResponseUpdate = {
  id: '98765',
  title: 'not neato',
  url: 'laneswim.com',
};
export const commentResponse = {
  id: '123456',
};
const createMock = (): jest.Mocked<ExternalService> => {
  return {
    createComment: jest.fn().mockImplementation(() => Promise.resolve(commentResponse)),
    createRecord: jest.fn().mockImplementation(() => Promise.resolve(recordResponseCreate)),
    updateRecord: jest.fn().mockImplementation(() => Promise.resolve(recordResponseUpdate)),
  };
};

const externalServiceMock = {
  create: createMock,
};

export const mappings = {
  alertSourceConfig: {
    id: 'adnjls',
    name: 'Alert Source',
    key: 'alert-source',
    fieldType: 'text',
  },
  severityConfig: {
    id: 'adnlas',
    name: 'Severity',
    key: 'severity',
    fieldType: 'text',
  },
  alertNameConfig: {
    id: 'adnfls',
    name: 'Alert Name',
    key: 'alert-name',
    fieldType: 'text',
  },
  caseIdConfig: {
    id: 'a6sst',
    name: 'Case Id',
    key: 'case-id-name',
    fieldType: 'text',
  },
  caseNameConfig: {
    id: 'a6fst',
    name: 'Case Name',
    key: 'case-name',
    fieldType: 'text',
  },
  commentsConfig: {
    id: 'a6fdf',
    name: 'Comments',
    key: 'comments',
    fieldType: 'text',
  },
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
