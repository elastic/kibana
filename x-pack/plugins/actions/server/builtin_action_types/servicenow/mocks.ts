/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalService, PushToServiceApiParams, ExecutorSubActionPushParams } from './types';

export const serviceNowCommonFields = [
  {
    column_label: 'Close notes',
    max_length: '4000',
    element: 'close_notes',
  },
  {
    column_label: 'Description',
    max_length: '4000',
    element: 'description',
  },
  {
    column_label: 'Short description',
    max_length: '160',
    element: 'short_description',
  },
  {
    column_label: 'Created by',
    max_length: '40',
    element: 'sys_created_by',
  },
  {
    column_label: 'Updated by',
    max_length: '40',
    element: 'sys_updated_by',
  },
];
const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getFields: jest.fn().mockImplementation(() => Promise.resolve(serviceNowCommonFields)),
    getIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        short_description: 'title from servicenow',
        description: 'description from servicenow',
      })
    ),
    createIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      })
    ),
    updateIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-2',
        title: 'INC02',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      })
    ),
    findIncidents: jest.fn(),
  };

  return service;
};

const externalServiceMock = {
  create: createMock,
};

const executorParams: ExecutorSubActionPushParams = {
  incident: {
    externalId: 'incident-3',
    short_description: 'Incident title',
    description: 'Incident description',
    severity: '1',
    urgency: '2',
    impact: '3',
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
