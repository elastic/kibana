/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalService, PushToServiceApiParams, ExecutorSubActionPushParams } from './types';

import { MapRecord } from '../case/types';

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        key: 'CK-1',
        summary: 'title from jira',
        description: 'description from jira',
        created: '2020-04-27T10:59:46.202Z',
        updated: '2020-04-27T10:59:46.202Z',
      })
    ),
    createIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      })
    ),
    updateIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      })
    ),
    createComment: jest.fn(),
    findIncidents: jest.fn(),
    getCapabilities: jest.fn(),
    getIssueTypes: jest.fn().mockImplementation(() => [
      {
        id: '10006',
        name: 'Task',
      },
      {
        id: '10007',
        name: 'Bug',
      },
    ]),
    getFieldsByIssueType: jest.fn().mockImplementation(() => ({
      summary: { allowedValues: [], defaultValue: {} },
      priority: {
        allowedValues: [
          {
            name: 'Medium',
            id: '3',
          },
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    })),
    getIssues: jest.fn().mockImplementation(() => [
      {
        id: '10267',
        key: 'RJ-107',
        title: 'Test title',
      },
    ]),
    getIssue: jest.fn().mockImplementation(() => ({
      id: '10267',
      key: 'RJ-107',
      title: 'Test title',
    })),
    getCommonFields: jest.fn().mockImplementation(() => jiraCommonFields),
  };

  service.createComment.mockImplementationOnce(() =>
    Promise.resolve({
      commentId: 'case-comment-1',
      pushedDate: '2020-04-27T10:59:46.202Z',
      externalCommentId: '1',
    })
  );

  service.createComment.mockImplementationOnce(() =>
    Promise.resolve({
      commentId: 'case-comment-2',
      pushedDate: '2020-04-27T10:59:46.202Z',
      externalCommentId: '2',
    })
  );

  return service;
};

const externalServiceMock = {
  create: createMock,
};
const jiraFields = [
  {
    id: 'issuetype',
    key: 'issuetype',
    name: 'Issue Type',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['issuetype', 'type'],
    schema: { type: 'issuetype', system: 'issuetype' },
  },
  {
    id: 'parent',
    key: 'parent',
    name: 'Parent',
    custom: false,
    orderable: false,
    navigable: true,
    searchable: false,
    clauseNames: ['parent'],
  },
  {
    id: 'summary',
    key: 'summary',
    name: 'Summary',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['summary'],
    schema: { type: 'string', system: 'summary' },
  },
  {
    id: 'reporter',
    key: 'reporter',
    name: 'Reporter',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['reporter'],
    schema: { type: 'user', system: 'reporter' },
  },
  {
    id: 'priority',
    key: 'priority',
    name: 'Priority',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['priority'],
    schema: { type: 'priority', system: 'priority' },
  },
  {
    id: 'description',
    key: 'description',
    name: 'Description',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['description'],
    schema: { type: 'string', system: 'description' },
  },
];
const jiraCommonFields = jiraFields.filter(({ id }) => id === 'summary' || id === 'description');
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

const executorParams: ExecutorSubActionPushParams = {
  savedObjectId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  externalId: 'incident-3',
  createdAt: '2020-04-27T10:59:46.202Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: '2020-04-27T10:59:46.202Z',
  updatedBy: { fullName: 'Elastic User', username: 'elastic' },
  title: 'Incident title',
  description: 'Incident description',
  labels: ['kibana', 'elastic'],
  priority: 'High',
  issueType: '10006',
  parent: null,
  comments: [
    {
      commentId: 'case-comment-1',
      comment: 'A comment',
      createdAt: '2020-04-27T10:59:46.202Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-04-27T10:59:46.202Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
    {
      commentId: 'case-comment-2',
      comment: 'Another comment',
      createdAt: '2020-04-27T10:59:46.202Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-04-27T10:59:46.202Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
  ],
};

const apiParams: PushToServiceApiParams = {
  ...executorParams,
  externalObject: { summary: 'Incident title', description: 'Incident description' },
};

export { jiraCommonFields, jiraFields, externalServiceMock, mapping, executorParams, apiParams };
