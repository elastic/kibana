/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalService, PushToServiceApiParams, ExecutorSubActionPushParams } from './types';
import { MapRecord } from './case_types';

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
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

const mapping: Map<string, Partial<MapRecord>> = new Map();

mapping.set('title', {
  target: 'short_description',
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

mapping.set('short_description', {
  target: 'title',
  actionType: 'overwrite',
});

const executorParams: ExecutorSubActionPushParams = {
  savedObjectId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  externalId: 'incident-3',
  title: 'Incident title',
  description: 'Incident description',
  comment: 'comment-1',
  severity: '3',
  urgency: '3',
  impact: '3',
  updatedAt: null,
};

const apiParams: PushToServiceApiParams = {
  ...executorParams,
  externalObject: { short_description: 'Incident title', description: 'Incident description' },
};

export { externalServiceMock, mapping, executorParams, apiParams };
