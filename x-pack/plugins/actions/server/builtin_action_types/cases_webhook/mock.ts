/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalService, ExecutorSubActionPushParams, PushToServiceApiParams } from './types';

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        key: 'CK-1',
        title: 'title from jira',
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
        url: 'https://coolsite.net/browse/CK-1',
      })
    ),
    updateIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://coolsite.net/browse/CK-1',
      })
    ),
    createComment: jest.fn(),
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

export const externalServiceMock = {
  create: createMock,
};

const executorParams: ExecutorSubActionPushParams = {
  incident: {
    externalId: 'incident-3',
    title: 'Incident title',
    description: 'Incident description',
    tags: ['kibana', 'elastic'],
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

export const apiParams: PushToServiceApiParams = executorParams;
