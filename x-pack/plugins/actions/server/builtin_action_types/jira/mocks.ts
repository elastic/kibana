/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalService, ApiParams, ExecutorActionParams, MapRecord } from '../common/types';

const createMock = (): jest.Mocked<ExternalService> => ({
  getIncident: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: '1',
      key: 'CK-1',
      summary: 'title from jira',
      description: 'description from jira',
      created: '2020-04-27T10:59:46.202Z',
      updated: '2020-04-27T10:59:46.202Z',
    })
  ),
  createIncident: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: '1',
      title: 'CK-1',
      pushedDate: '2020-04-27T10:59:46.202Z',
      url: 'https://siem-kibana.atlassian.net/browse/CK-1',
    })
  ),
  updateIncident: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: 'incident-2',
      title: 'INC02',
      pushedDate: '2020-04-27T10:59:46.202Z',
      url: 'https://siem-kibana.atlassian.net/browse/CK-1',
    })
  ),
  createComment: jest.fn().mockImplementation(() =>
    Promise.resolve({
      commentId: 'comment-1',
      pushedDate: '2020-04-27T10:59:46.202Z',
      externalCommentId: '1',
    })
  ),
});

const externalServiceMock = {
  create: createMock,
};

const mapping: Map<string, Partial<MapRecord>> = new Map();

mapping.set('title', {
  target: 'summary',
  actionType: 'overwrite',
});

mapping.set('description', {
  target: 'description',
  actionType: 'overwrite',
});

mapping.set('comments', {
  target: 'comments',
  actionType: 'append',
});

mapping.set('summary', {
  target: 'title',
  actionType: 'overwrite',
});

const executorParams: ExecutorActionParams = {
  caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  externalId: 'incident-3',
  createdAt: '2020-04-27T10:59:46.202Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: '2020-04-27T10:59:46.202Z',
  updatedBy: { fullName: 'Elastic User', username: 'elastic' },
  title: 'Incident title',
  description: 'Incident description',
  comments: [
    {
      commentId: 'case-comment-1',
      version: 'WzU3LDFd',
      comment: 'A comment',
      createdAt: '2020-04-27T10:59:46.202Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-04-27T10:59:46.202Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
    {
      commentId: 'case-comment-2',
      version: 'WlK3LDFd',
      comment: 'Another comment',
      createdAt: '2020-04-27T10:59:46.202Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-04-27T10:59:46.202Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
  ],
};

const apiParams: ApiParams = {
  ...executorParams,
  externalCase: { summary: 'Incident title', description: 'Incident description' },
};

export { externalServiceMock, mapping, executorParams, apiParams };
