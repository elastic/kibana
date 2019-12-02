/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockCases = [
  {
    type: 'case-workflow',
    id: '3379c780-0fce-11ea-a2db-6b4d84335bfc',
    attributes: {
      creation_date: 1574718888885,
      last_edit_date: 1574718888885,
      reporter: {
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
    id: '65d20440-0fd3-11ea-84ca-bdbdbec58a3f',
    attributes: {
      creation_date: 1574721120834,
      last_edit_date: 1574721120834,
      reporter: {
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
    id: '6ffb2eb0-0fd3-11ea-84ca-bdbdbec58a3f',
    attributes: {
      creation_date: 1574721137881,
      last_edit_date: 1574721137881,
      reporter: {
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
    id: '3a2a9410-0fce-11ea-a2db-6b4d84335bfc',
    attributes: {
      comment: 'Wow, good luck catching that bad meanie!',
      creation_date: 1574718900112,
      last_edit_date: 1574718900112,
      user: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: '3379c780-0fce-11ea-a2db-6b4d84335bfc',
      },
    ],
    updated_at: '2019-11-25T21:55:00.177Z',
    version: 'WzEsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: '3bb94a60-0fce-11ea-a2db-6b4d84335bfc',
    attributes: {
      comment: 'Well I decided to update my comment. So what? Deal with it.',
      creation_date: 1574718902724,
      last_edit_date: 1574718914556,
      user: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: '3379c780-0fce-11ea-a2db-6b4d84335bfc',
      },
    ],
    updated_at: '2019-11-25T21:55:14.633Z',
    version: 'WzMsMV0=',
  },
  {
    type: 'case-workflow-comment',
    id: '77871900-0fd3-11ea-84ca-bdbdbec58a3f',
    attributes: {
      comment: 'Wow, good luck catching that bad meanie!',
      creation_date: 1574721150542,
      last_edit_date: 1574721150542,
      user: {
        full_name: null,
        username: 'elastic',
      },
    },
    references: [
      {
        type: 'case-workflow',
        name: 'associated-case-workflow',
        id: '6ffb2eb0-0fd3-11ea-84ca-bdbdbec58a3f',
      },
    ],
    updated_at: '2019-11-25T22:32:30.608Z',
    version: 'WzYsMV0=',
  },
];
