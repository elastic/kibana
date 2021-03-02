/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import {
  AssociationType,
  CaseStatuses,
  CaseType,
  CaseUserActionAttributes,
  CommentAttributes,
  CommentType,
  ConnectorMappings,
  ConnectorTypes,
  ESCaseAttributes,
  ESCasesConfigureAttributes,
} from '../../../../common/api';
import {
  CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../saved_object_types';
import { mappings } from '../../../client/configure/mock';

export const mockCases: Array<SavedObject<ESCaseAttributes>> = [
  {
    type: 'cases',
    id: 'mock-id-1',
    attributes: {
      closed_at: null,
      closed_by: null,
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: [],
      },
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      description: 'This is a brand new case of a bad meanie defacing data',
      external_service: null,
      title: 'Super Bad Security Issue',
      status: CaseStatuses.open,
      tags: ['defacement'],
      type: CaseType.individual,
      updated_at: '2019-11-25T21:54:48.952Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      settings: {
        syncAlerts: true,
      },
    },
    references: [],
    updated_at: '2019-11-25T21:54:48.952Z',
    version: 'WzAsMV0=',
  },
  {
    type: 'cases',
    id: 'mock-id-2',
    attributes: {
      closed_at: null,
      closed_by: null,
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: [],
      },
      created_at: '2019-11-25T22:32:00.900Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie destroying data!',
      external_service: null,
      title: 'Damaging Data Destruction Detected',
      status: CaseStatuses.open,
      tags: ['Data Destruction'],
      type: CaseType.individual,
      updated_at: '2019-11-25T22:32:00.900Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      settings: {
        syncAlerts: true,
      },
    },
    references: [],
    updated_at: '2019-11-25T22:32:00.900Z',
    version: 'WzQsMV0=',
  },
  {
    type: 'cases',
    id: 'mock-id-3',
    attributes: {
      closed_at: null,
      closed_by: null,
      connector: {
        id: '123',
        name: 'My connector',
        type: ConnectorTypes.jira,
        fields: [
          { key: 'issueType', value: 'Task' },
          { key: 'priority', value: 'High' },
          { key: 'parent', value: null },
        ],
      },
      created_at: '2019-11-25T22:32:17.947Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie going LOLBins all over the place!',
      external_service: null,
      title: 'Another bad one',
      status: CaseStatuses.open,
      tags: ['LOLBins'],
      type: CaseType.individual,
      updated_at: '2019-11-25T22:32:17.947Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      settings: {
        syncAlerts: true,
      },
    },
    references: [],
    updated_at: '2019-11-25T22:32:17.947Z',
    version: 'WzUsMV0=',
  },
  {
    type: 'cases',
    id: 'mock-id-4',
    attributes: {
      closed_at: '2019-11-25T22:32:17.947Z',
      closed_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      connector: {
        id: '123',
        name: 'My connector',
        type: ConnectorTypes.jira,
        fields: [
          { key: 'issueType', value: 'Task' },
          { key: 'priority', value: 'High' },
          { key: 'parent', value: null },
        ],
      },
      created_at: '2019-11-25T22:32:17.947Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie going LOLBins all over the place!',
      external_service: null,
      status: CaseStatuses.closed,
      title: 'Another bad one',
      tags: ['LOLBins'],
      type: CaseType.individual,
      updated_at: '2019-11-25T22:32:17.947Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      settings: {
        syncAlerts: true,
      },
    },
    references: [],
    updated_at: '2019-11-25T22:32:17.947Z',
    version: 'WzUsMV0=',
  },
];

export const mockCaseNoConnectorId: SavedObject<Partial<ESCaseAttributes>> = {
  type: 'cases',
  id: 'mock-no-connector_id',
  attributes: {
    closed_at: null,
    closed_by: null,
    created_at: '2019-11-25T21:54:48.952Z',
    created_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
    description: 'This is a brand new case of a bad meanie defacing data',
    external_service: null,
    title: 'Super Bad Security Issue',
    status: CaseStatuses.open,
    tags: ['defacement'],
    updated_at: '2019-11-25T21:54:48.952Z',
    updated_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
    settings: {
      syncAlerts: true,
    },
  },
  references: [],
  updated_at: '2019-11-25T21:54:48.952Z',
  version: 'WzAsMV0=',
};

export const mockCasesErrorTriggerData = [
  {
    id: 'valid-id',
  },
  {
    id: 'bad-guy',
  },
];

export const mockCaseComments: Array<SavedObject<CommentAttributes>> = [
  {
    type: 'cases-comment',
    id: 'mock-comment-1',
    attributes: {
      associationType: AssociationType.case,
      comment: 'Wow, good luck catching that bad meanie!',
      type: CommentType.user,
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T21:55:00.177Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'cases',
        name: 'associated-cases',
        id: 'mock-id-1',
      },
    ],
    updated_at: '2019-11-25T21:55:00.177Z',
    version: 'WzEsMV0=',
  },
  {
    type: 'cases-comment',
    id: 'mock-comment-2',
    attributes: {
      associationType: AssociationType.case,
      comment: 'Well I decided to update my comment. So what? Deal with it.',
      type: CommentType.user,
      created_at: '2019-11-25T21:55:14.633Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T21:55:14.633Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'cases',
        name: 'associated-cases',
        id: 'mock-id-1',
      },
    ],
    updated_at: '2019-11-25T21:55:14.633Z',

    version: 'WzMsMV0=',
  },
  {
    type: 'cases-comment',
    id: 'mock-comment-3',
    attributes: {
      associationType: AssociationType.case,
      comment: 'Wow, good luck catching that bad meanie!',
      type: CommentType.user,
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T22:32:30.608Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'cases',
        name: 'associated-cases',
        id: 'mock-id-3',
      },
    ],
    updated_at: '2019-11-25T22:32:30.608Z',
    version: 'WzYsMV0=',
  },
  {
    type: 'cases-comment',
    id: 'mock-comment-4',
    attributes: {
      associationType: AssociationType.case,
      type: CommentType.alert,
      index: 'test-index',
      alertId: 'test-id',
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      rule: {
        id: 'rule-id-1',
        name: 'rule-name-1',
      },
      updated_at: '2019-11-25T22:32:30.608Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'cases',
        name: 'associated-cases',
        id: 'mock-id-4',
      },
    ],
    updated_at: '2019-11-25T22:32:30.608Z',
    version: 'WzYsMV0=',
  },
  {
    type: 'cases-comment',
    id: 'mock-comment-5',
    attributes: {
      associationType: AssociationType.case,
      type: CommentType.alert,
      index: 'test-index-2',
      alertId: 'test-id-2',
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      rule: {
        id: 'rule-id-2',
        name: 'rule-name-2',
      },
      updated_at: '2019-11-25T22:32:30.608Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'cases',
        name: 'associated-cases',
        id: 'mock-id-4',
      },
    ],
    updated_at: '2019-11-25T22:32:30.608Z',
    version: 'WzYsMV0=',
  },
];

export const mockCaseConfigure: Array<SavedObject<ESCasesConfigureAttributes>> = [
  {
    type: 'cases-configure',
    id: 'mock-configuration-1',
    attributes: {
      connector: {
        id: '789',
        name: 'My connector 3',
        type: ConnectorTypes.jira,
        fields: null,
      },
      closure_type: 'close-by-user',
      created_at: '2020-04-09T09:43:51.778Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      updated_at: '2020-04-09T09:43:51.778Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references: [],
    updated_at: '2020-04-09T09:43:51.778Z',
    version: 'WzYsMV0=',
  },
];

export const mockCaseMappings: Array<SavedObject<ConnectorMappings>> = [
  {
    type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
    id: 'mock-mappings-1',
    attributes: {
      mappings: mappings[ConnectorTypes.jira],
    },
    references: [],
  },
];

export const mockUserActions: Array<SavedObject<CaseUserActionAttributes>> = [
  {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: 'mock-user-actions-1',
    attributes: {
      action_field: ['description', 'status', 'tags', 'title', 'connector', 'settings'],
      action: 'create',
      action_at: '2021-02-03T17:41:03.771Z',
      action_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      },
      new_value:
        '{"title":"A case","tags":["case"],"description":"Yeah!","connector":{"id":"connector-od","name":"My Connector","type":".servicenow-sir","fields":{"category":"Denial of Service","destIp":true,"malwareHash":true,"malwareUrl":true,"priority":"2","sourceIp":true,"subcategory":"45"}},"settings":{"syncAlerts":true}}',
      old_value: null,
    },
    version: 'WzYsMV0=',
    references: [],
  },
  {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: 'mock-user-actions-2',
    attributes: {
      action_field: ['comment'],
      action: 'create',
      action_at: '2021-02-03T17:44:21.067Z',
      action_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      },
      new_value:
        '{"type":"alert","alertId":"cec3da90fb37a44407145adf1593f3b0d5ad94c4654201f773d63b5d4706128e","index":".siem-signals-default-000008"}',
      old_value: null,
    },
    version: 'WzYsMV0=',
    references: [],
  },
];
