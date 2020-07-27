/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExternalService,
  PushToServiceApiParams,
  ExecutorSubActionPushParams,
  MapRecord,
} from '../case/types';

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '1',
        name: 'title from ibm resilient',
        description: 'description from ibm resilient',
        discovered_date: 1589391874472,
        create_date: 1591192608323,
        inc_last_modified_date: 1591192650372,
      })
    ),
    createIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '1',
        title: '1',
        pushedDate: '2020-06-03T15:09:13.606Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      })
    ),
    updateIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '1',
        title: '1',
        pushedDate: '2020-06-03T15:09:13.606Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      })
    ),
    createComment: jest.fn(),
  };

  service.createComment.mockImplementationOnce(() =>
    Promise.resolve({
      commentId: 'case-comment-1',
      pushedDate: '2020-06-03T15:09:13.606Z',
      externalCommentId: '1',
    })
  );

  service.createComment.mockImplementationOnce(() =>
    Promise.resolve({
      commentId: 'case-comment-2',
      pushedDate: '2020-06-03T15:09:13.606Z',
      externalCommentId: '2',
    })
  );

  return service;
};

const externalServiceMock = {
  create: createMock,
};

const mapping: Map<string, Partial<MapRecord>> = new Map();

mapping.set('title', {
  target: 'name',
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

mapping.set('name', {
  target: 'title',
  actionType: 'overwrite',
});

const executorParams: ExecutorSubActionPushParams = {
  savedObjectId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  externalId: 'incident-3',
  createdAt: '2020-06-03T15:09:13.606Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: '2020-06-03T15:09:13.606Z',
  updatedBy: { fullName: 'Elastic User', username: 'elastic' },
  title: 'Incident title',
  description: 'Incident description',
  comments: [
    {
      commentId: 'case-comment-1',
      comment: 'A comment',
      createdAt: '2020-06-03T15:09:13.606Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-06-03T15:09:13.606Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
    {
      commentId: 'case-comment-2',
      comment: 'Another comment',
      createdAt: '2020-06-03T15:09:13.606Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: '2020-06-03T15:09:13.606Z',
      updatedBy: { fullName: 'Elastic User', username: 'elastic' },
    },
  ],
};

const apiParams: PushToServiceApiParams = {
  ...executorParams,
  externalCase: { name: 'Incident title', description: 'Incident description' },
};

export { externalServiceMock, mapping, executorParams, apiParams };
