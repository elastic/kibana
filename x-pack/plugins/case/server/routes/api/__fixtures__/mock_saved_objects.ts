/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'kibana/server';
import { CaseAttributes, CommentAttributes } from '../../../../common/api';

export const mockCases: Array<SavedObject<CaseAttributes>> = [
  {
    type: 'cases',
    id: 'mock-id-1',
    attributes: {
      comment_ids: ['mock-comment-1'],
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      description: 'This is a brand new case of a bad meanie defacing data',
      title: 'Super Bad Security Issue',
      state: 'open',
      tags: ['defacement'],
      updated_at: '2019-11-25T21:54:48.952Z',
      updated_by: {
        full_name: 'elastic',
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
      comment_ids: [],
      created_at: '2019-11-25T22:32:00.900Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie destroying data!',
      title: 'Damaging Data Destruction Detected',
      state: 'open',
      tags: ['Data Destruction'],
      updated_at: '2019-11-25T22:32:00.900Z',
      updated_by: {
        full_name: 'elastic',
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
      comment_ids: [],
      created_at: '2019-11-25T22:32:17.947Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie going LOLBins all over the place!',
      title: 'Another bad one',
      state: 'open',
      tags: ['LOLBins'],
      updated_at: '2019-11-25T22:32:17.947Z',
      updated_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
    },
    references: [],
    updated_at: '2019-11-25T22:32:17.947Z',
    version: 'WzUsMV0=',
  },
];

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
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      updated_at: '2019-11-25T21:55:00.177Z',
      updated_by: {
        full_name: 'elastic',
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
      created_at: '2019-11-25T21:55:14.633Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      updated_at: '2019-11-25T21:55:14.633Z',
      updated_by: {
        full_name: 'elastic',
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
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        username: 'elastic',
      },
      updated_at: '2019-11-25T22:32:30.608Z',
      updated_by: {
        full_name: 'elastic',
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
];
