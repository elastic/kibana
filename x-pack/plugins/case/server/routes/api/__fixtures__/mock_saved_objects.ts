/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockCases = [
  {
    type: 'case-workflow',
    id: 'mock-id-1',
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
    updated_at: 1574718888885,
    references: [],
    version: 'WzAsMV0=',
  },
  {
    type: 'case-workflow',
    id: 'mock-id-2',
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
    updated_at: 1574721130834,

    references: [],
    version: 'WzQsMV0=',
  },
  {
    type: 'case-workflow',
    id: 'mock-id-3',
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
    updated_at: 1574721147881,
    references: [],
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
    comment: 'Wow, good luck catching that bad meanie!',
    created_at: 1574718900112,
    created_by: {
      full_name: null,
      username: 'elastic',
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-1',
      },
    ],
    updated_at: 1574718900112,
    version: 'WzEsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: 'mock-comment-2',
    comment: 'Well I decided to update my comment. So what? Deal with it.',
    created_at: 1574718902724,
    created_by: {
      full_name: null,
      username: 'elastic',
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-1',
      },
    ],
    updated_at: 1574718902724,
    version: 'WzMsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: 'mock-comment-3',
    comment: 'Wow, good luck catching that bad meanie!',
    created_at: 1574721150542,
    created_by: {
      full_name: null,
      username: 'elastic',
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: 'mock-id-3',
      },
    ],
    updated_at: 1574721150542,
    version: 'WzYsMV0=',
  },
];
