/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalService, PushToServiceApiParams, ExecutorSubActionPushParams } from './types';

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
    getFields: jest.fn().mockImplementation(() => ({
      description: {
        allowedValues: [],
        defaultValue: {},
        required: true,
        schema: { type: 'string' },
      },
      summary: {
        allowedValues: [],
        defaultValue: {},
        required: true,
        schema: { type: 'string' },
      },
    })),
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

const executorParams: ExecutorSubActionPushParams = {
  incident: {
    externalId: 'incident-3',
    summary: 'Incident title',
    description: 'Incident description',
    labels: ['kibana', 'elastic'],
    priority: 'High',
    issueType: '10006',
    parent: null,
  },
  comments: [
    {
      commentId: 'case-comment-1',
      comment: 'A comment',
    },
    {
      commentId: 'case-comment-2',
      comment: 'Another comment',
    },
  ],
};

const apiParams: PushToServiceApiParams = {
  ...executorParams,
};

export { externalServiceMock, executorParams, apiParams };
