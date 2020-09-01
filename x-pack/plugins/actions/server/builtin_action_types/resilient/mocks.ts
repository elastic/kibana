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
    findIncidents: jest.fn(),
    getIncidentTypes: jest.fn().mockImplementation(() => [
      { id: 17, name: 'Communication error (fax; email)' },
      { id: 1001, name: 'Custom type' },
    ]),
    getSeverity: jest.fn().mockImplementation(() => [
      {
        id: 4,
        name: 'Low',
      },
      {
        id: 5,
        name: 'Medium',
      },
      {
        id: 6,
        name: 'High',
      },
    ]),
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
  incidentTypes: [1001],
  severityCode: 6,
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
  externalObject: { name: 'Incident title', description: 'Incident description' },
};

const incidentTypes = [
  {
    value: 17,
    label: 'Communication error (fax; email)',
    enabled: true,
    properties: null,
    uuid: '4a8d22f7-d89e-4403-85c7-2bafe3b7f2ae',
    hidden: false,
    default: false,
  },
  {
    value: 1001,
    label: 'Custom type',
    enabled: true,
    properties: null,
    uuid: '3b51c8c2-9758-48f8-b013-bd141f1d2ec9',
    hidden: false,
    default: false,
  },
];

const severity = [
  {
    value: 4,
    label: 'Low',
    enabled: true,
    properties: null,
    uuid: '97cae239-963d-4e36-be34-07e47ef2cc86',
    hidden: false,
    default: true,
  },
  {
    value: 5,
    label: 'Medium',
    enabled: true,
    properties: null,
    uuid: 'c2c354c9-6d1e-4a48-82e5-bd5dc5068339',
    hidden: false,
    default: false,
  },
  {
    value: 6,
    label: 'High',
    enabled: true,
    properties: null,
    uuid: '93e5c99c-563b-48b9-80a3-9572307622d8',
    hidden: false,
    default: false,
  },
];

export { externalServiceMock, mapping, executorParams, apiParams, incidentTypes, severity };
