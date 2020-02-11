/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockCases = [
  {
    type: 'case-workflow',
    id: 'mock-id-1',
    attributes: {
      created_at: 1574718888885,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
      description: 'This is a brand new case of a bad meanie defacing data',
      title: 'Super Bad Security Issue',
      state: 'open',
      tags: ['defacement'],
      case_type: 'security',
      assignees: [],
    },
    references: [],
    updated_at: '2019-11-25T21:54:48.952Z',
    version: 'WzAsMV0=',
  },
  {
    type: 'case-workflow',
    id: 'mock-id-2',
    attributes: {
      created_at: 1574721120834,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie destroying data!',
      title: 'Damaging Data Destruction Detected',
      state: 'open',
      tags: ['Data Destruction'],
      case_type: 'security',
      assignees: [],
    },
    references: [],
    updated_at: '2019-11-25T22:32:00.900Z',
    version: 'WzQsMV0=',
  },
  {
    type: 'case-workflow',
    id: 'mock-id-3',
    attributes: {
      created_at: 1574721137881,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
      description: 'Oh no, a bad meanie going LOLBins all over the place!',
      title: 'Another bad one',
      state: 'open',
      tags: ['LOLBins'],
      case_type: 'security',
      assignees: [],
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

export const mockCaseComments = [
  {
    type: 'case-workflow-comment',
    id: 'mock-comment-1',
    attributes: {
      comment: 'Wow, good luck catching that bad meanie!',
      created_at: 1574718900112,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-1',
      },
    ],
    updated_at: '2019-11-25T21:55:00.177Z',
    version: 'WzEsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: 'mock-comment-2',
    attributes: {
      comment: 'Well I decided to update my comment. So what? Deal with it.',
      created_at: 1574718902724,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-1',
      },
    ],
    updated_at: '2019-11-25T21:55:14.633Z',
    version: 'WzMsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: 'mock-comment-3',
    attributes: {
      comment: 'Wow, good luck catching that bad meanie!',
      created_at: 1574721150542,
      created_by: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-3',
      },
    ],
    updated_at: '2019-11-25T22:32:30.608Z',
    version: 'WzYsMV0=',
  },
];
