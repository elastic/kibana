/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalService } from './types';

export const applicationFields = [
  {
    id: 'adnjls',
    name: 'Alert Source',
    key: 'alert-source',
    fieldType: 'text',
  },
  {
    id: 'adnlas',
    name: 'Severity',
    key: 'severity',
    fieldType: 'text',
  },
  {
    id: 'adnfls',
    name: 'Rule Name',
    key: 'rule-name',
    fieldType: 'text',
  },
  {
    id: 'a6sst',
    name: 'Case Id',
    key: 'case-id-name',
    fieldType: 'text',
  },
  {
    id: 'a6fst',
    name: 'Case Name',
    key: 'case-name',
    fieldType: 'text',
  },
  {
    id: 'a6fdf',
    name: 'Comments',
    key: 'comments',
    fieldType: 'notes',
  },
  {
    id: 'a6fde',
    name: 'Description',
    key: 'description',
    fieldType: 'text',
  },
  {
    id: 'dfnkls',
    name: 'Alert ID',
    key: 'alert-id',
    fieldType: 'text',
  },
];

export const mappings = {
  alertSourceConfig: applicationFields[0],
  severityConfig: applicationFields[1],
  ruleNameConfig: applicationFields[2],
  caseIdConfig: applicationFields[3],
  caseNameConfig: applicationFields[4],
  commentsConfig: applicationFields[5],
  descriptionConfig: applicationFields[6],
  alertIdConfig: applicationFields[7],
};

export const getApplicationResponse = { fields: applicationFields };

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

const executorParams = {
  ruleName: 'rule-name',
  alertSource: 'alert-source',
  caseId: 'case-id',
  caseName: 'case-name',
  comments: 'comments',
  severity: 'severity',
  alertId: 'alert-id',
};

const apiParams = {
  ...executorParams,
};

export { externalServiceMock, executorParams, apiParams };
