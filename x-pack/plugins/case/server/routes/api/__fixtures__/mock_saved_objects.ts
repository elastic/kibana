/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import {
  ESCasesConfigureAttributes,
  CommentAttributes,
  ESCaseAttributes,
  ConnectorTypes,
  CommentType,
  CaseStatuses,
} from '../../../../common/api';

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
      updated_at: '2019-11-25T21:54:48.952Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
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
      updated_at: '2019-11-25T22:32:00.900Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
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
      updated_at: '2019-11-25T22:32:17.947Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
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
      updated_at: '2019-11-25T22:32:17.947Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
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

export const mockCaseConfigureFind: Array<SavedObjectsFindResponse<ESCasesConfigureAttributes>> = [
  {
    page: 1,
    per_page: 5,
    total: mockCaseConfigure.length,
    saved_objects: [{ ...mockCaseConfigure[0], score: 0 }],
  },
];
