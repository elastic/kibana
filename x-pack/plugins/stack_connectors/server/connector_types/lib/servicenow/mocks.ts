/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalService,
  ExecutorSubActionPushParams,
  PushToServiceApiParamsSIR,
  ExternalServiceSIR,
  Observable,
  ObservableTypes,
  ExternalServiceITOM,
  ExecutorSubActionAddEventParams,
} from './types';

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

export const serviceNowChoices = [
  {
    dependent_value: '',
    label: '1 - Critical',
    value: '1',
    element: 'priority',
  },
  {
    dependent_value: '',
    label: '2 - High',
    value: '2',
    element: 'priority',
  },
  {
    dependent_value: '',
    label: '3 - Moderate',
    value: '3',
    element: 'priority',
  },
  {
    dependent_value: '',
    label: '4 - Low',
    value: '4',
    element: 'priority',
  },
  {
    dependent_value: '',
    label: '5 - Planning',
    value: '5',
    element: 'priority',
  },
];

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getChoices: jest.fn().mockImplementation(() => Promise.resolve(serviceNowChoices)),
    getFields: jest.fn().mockImplementation(() => Promise.resolve(serviceNowCommonFields)),
    getIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
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
    getApplicationInformation: jest.fn().mockImplementation(() =>
      Promise.resolve({
        name: 'Elastic',
        scope: 'x_elas2_inc_int',
        version: '1.0.0',
      })
    ),
    checkIfApplicationIsInstalled: jest.fn(),
    getUrl: jest.fn().mockImplementation(() => 'https://instance.service-now.com'),
    checkInstance: jest.fn(),
  };

  return service;
};

const createSIRMock = (): jest.Mocked<ExternalServiceSIR> => {
  const service = {
    ...createMock(),
    addObservableToIncident: jest.fn().mockImplementation(() =>
      Promise.resolve({
        value: 'https://example.com',
        observable_sys_id: '3',
      })
    ),
    bulkAddObservableToIncident: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          value: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          observable_sys_id: '1',
        },
        {
          value: '127.0.0.1',
          observable_sys_id: '2',
        },
        {
          value: 'https://example.com',
          observable_sys_id: '3',
        },
      ])
    ),
  };

  return service;
};

const createITOMMock = (): jest.Mocked<ExternalServiceITOM> => {
  const serviceMock = createMock();
  const service = {
    getChoices: serviceMock.getChoices,
    addEvent: jest.fn().mockImplementation(() => Promise.resolve()),
  };

  return service;
};

export const externalServiceMock = {
  create: createMock,
};

export const externalServiceSIRMock = {
  create: createSIRMock,
};

export const externalServiceITOMMock = {
  create: createITOMMock,
};

export const executorParams: ExecutorSubActionPushParams = {
  incident: {
    externalId: 'incident-3',
    short_description: 'Incident title',
    description: 'Incident description',
    severity: '1',
    urgency: '2',
    impact: '3',
    category: 'software',
    subcategory: 'os',
    correlation_id: 'ruleId',
    correlation_display: 'Alerting',
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

export const sirParams: PushToServiceApiParamsSIR = {
  incident: {
    externalId: 'incident-3',
    short_description: 'Incident title',
    description: 'Incident description',
    dest_ip: ['192.168.1.1', '192.168.1.3'],
    source_ip: ['192.168.1.2', '192.168.1.4'],
    malware_hash: ['5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9'],
    malware_url: ['https://example.com'],
    category: 'software',
    subcategory: 'os',
    correlation_id: 'ruleId',
    correlation_display: 'Alerting',
    priority: '1',
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

export const observables: Observable[] = [
  {
    value: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
    type: ObservableTypes.sha256,
  },
  {
    value: '127.0.0.1',
    type: ObservableTypes.ip4,
  },
  {
    value: 'https://example.com',
    type: ObservableTypes.url,
  },
];

export const apiParams = executorParams;

export const itomEventParams: ExecutorSubActionAddEventParams = {
  source: 'A source',
  event_class: 'An event class',
  resource: 'C:',
  node: 'node.example.com',
  metric_name: 'Percentage Logical Disk Free Space',
  type: 'Disk space',
  severity: '4',
  description: 'desc',
  additional_info: '{"alert": "test"}',
  message_key: 'a key',
  time_of_event: '2021-10-13T10:51:44.981Z',
};
