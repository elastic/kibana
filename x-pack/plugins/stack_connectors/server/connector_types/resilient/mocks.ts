/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalService, PushToServiceApiParams, ExecutorSubActionPushParams } from './types';

export const resilientFields = [
  {
    id: 17,
    name: 'name',
    text: 'Name',
    prefix: null,
    type_id: 0,
    tooltip: 'A unique name to identify this particular incident.',
    input_type: 'text',
    required: 'always',
    hide_notification: false,
    chosen: false,
    default_chosen_by_server: false,
    blank_option: false,
    internal: true,
    uuid: 'ad6ed4f2-8d87-4ba2-81fa-03568a9326cc',
    operations: [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'changed',
      'changed_to',
      'not_changed_to',
      'has_a_value',
      'not_has_a_value',
    ],
    operation_perms: {
      changed_to: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_changed_to: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      equals: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      changed: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      contains: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_contains: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_equals: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
    },
    values: [],
    perms: {
      delete: false,
      modify_name: false,
      modify_values: false,
      modify_blank: false,
      modify_required: false,
      modify_operations: false,
      modify_chosen: false,
      modify_default: false,
      show_in_manual_actions: true,
      show_in_auto_actions: true,
      show_in_notifications: true,
      show_in_scripts: true,
      modify_type: ['text'],
      sort: true,
    },
    read_only: false,
    changeable: true,
    rich_text: false,
    templates: [],
    deprecated: false,
    tags: [],
    calculated: false,
    is_tracked: false,
    allow_default_value: false,
  },
  {
    id: 15,
    name: 'description',
    text: 'Description',
    prefix: null,
    type_id: 0,
    tooltip: 'A free form text description of the incident.',
    input_type: 'textarea',
    hide_notification: false,
    chosen: false,
    default_chosen_by_server: false,
    blank_option: false,
    internal: true,
    uuid: '420d70b1-98f9-4681-a20b-84f36a9e5e48',
    operations: [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'changed',
      'changed_to',
      'not_changed_to',
      'has_a_value',
      'not_has_a_value',
    ],
    operation_perms: {
      changed_to: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_changed_to: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      equals: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      changed: {
        show_in_manual_actions: false,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      contains: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_contains: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_equals: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
    },
    values: [],
    perms: {
      delete: false,
      modify_name: false,
      modify_values: false,
      modify_blank: false,
      modify_required: false,
      modify_operations: false,
      modify_chosen: false,
      modify_default: false,
      show_in_manual_actions: true,
      show_in_auto_actions: true,
      show_in_notifications: true,
      show_in_scripts: true,
      modify_type: ['textarea'],
      sort: true,
    },
    read_only: false,
    changeable: true,
    rich_text: true,
    templates: [],
    deprecated: false,
    tags: [],
    calculated: false,
    is_tracked: false,
    allow_default_value: false,
  },
  {
    id: 65,
    name: 'create_date',
    text: 'Date Created',
    prefix: null,
    type_id: 0,
    tooltip: 'The date the incident was created. This field is read-only.',
    input_type: 'datetimepicker',
    hide_notification: false,
    chosen: false,
    default_chosen_by_server: false,
    blank_option: false,
    internal: true,
    uuid: 'b4faf728-881a-4e8b-bf0b-d39b720392a1',
    operations: ['due_within', 'overdue_by', 'has_a_value', 'not_has_a_value'],
    operation_perms: {
      has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      not_has_a_value: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      due_within: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
      overdue_by: {
        show_in_manual_actions: true,
        show_in_auto_actions: true,
        show_in_notifications: true,
      },
    },
    values: [],
    perms: {
      delete: false,
      modify_name: false,
      modify_values: false,
      modify_blank: false,
      modify_required: false,
      modify_operations: false,
      modify_chosen: false,
      modify_default: false,
      show_in_manual_actions: true,
      show_in_auto_actions: true,
      show_in_notifications: true,
      show_in_scripts: true,
      modify_type: ['datetimepicker'],
      sort: true,
    },
    read_only: true,
    changeable: false,
    rich_text: false,
    templates: [],
    deprecated: false,
    tags: [],
    calculated: false,
    is_tracked: false,
    allow_default_value: false,
  },
];

const createMock = (): jest.Mocked<ExternalService> => {
  const service = {
    getFields: jest.fn().mockImplementation(() => Promise.resolve(resilientFields)),
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

const executorParams: ExecutorSubActionPushParams = {
  incident: {
    externalId: 'incident-3',
    name: 'Incident title',
    description: 'Incident description',
    incidentTypes: [1001],
    severityCode: 6,
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

export { externalServiceMock, executorParams, apiParams, incidentTypes, severity };
