/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-plugin/common';

export const mockCasesResult = {
  cases: [
    {
      id: '0ce2a510-c43a-11ec-98b5-3109bd2a1901',
      version: 'Wzg2MDIsMV0=',
      comments: [],
      totalComment: 0,
      totalAlerts: 1,
      title: 'sdcsd',
      tags: [],
      description: 'klklk',
      settings: {
        syncAlerts: true,
      },
      owner: 'securitySolution',
      closed_at: '2022-04-25T01:50:40.435Z',
      closed_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      createdAt: '2022-04-25T01:50:14.499Z',
      createdBy: {
        username: 'elastic',
        email: null,
        full_name: null,
      },
      status: 'open',
      updated_at: '2022-04-25T01:50:40.435Z',
      updated_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
      external_service: null,
    },
    {
      id: 'dc12f930-c178-11ec-98b5-3109bd2a1901',
      version: 'Wzg5NjksMV0=',
      comments: [],
      totalComment: 0,
      totalAlerts: 2,
      title: 'zzzz',
      tags: [],
      description: 'sssss',
      settings: {
        syncAlerts: true,
      },
      owner: 'securitySolution',
      closed_at: '2022-04-25T13:45:18.317Z',
      closed_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      createdAt: '2022-04-21T13:42:17.414Z',
      createdBy: {
        username: 'elastic',
        email: null,
        full_name: null,
      },
      status: 'in-progress',
      updated_at: '2022-04-25T13:45:18.317Z',
      updated_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
      external_service: null,
    },
    {
      id: 'd11cbac0-c178-11ec-98b5-3109bd2a1901',
      version: 'Wzg5ODQsMV0=',
      comments: [],
      totalComment: 0,
      totalAlerts: 3,
      title: 'asxa',
      tags: [],
      description: 'dsdd',
      settings: {
        syncAlerts: true,
      },
      owner: 'securitySolution',
      closed_at: '2022-04-25T13:45:22.539Z',
      closed_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      createdAt: '2022-04-21T13:41:59.025Z',
      createdBy: {
        username: 'elastic',
        email: null,
        full_name: null,
      },
      status: 'closed',
      updated_at: '2022-04-25T13:45:22.539Z',
      updated_by: {
        full_name: null,
        email: null,
        username: 'elastic',
      },
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
      external_service: null,
    },
  ],
};

export const parsedCasesItems = [
  {
    name: 'sdcsd',
    totalAlerts: 1,
    createdBy: 'elastic',
    status: CaseStatuses.open,
    createdAt: '2022-04-25T01:50:14.499Z',
    id: '0ce2a510-c43a-11ec-98b5-3109bd2a1901',
  },
  {
    name: 'zzzz',
    totalAlerts: 2,
    status: CaseStatuses['in-progress'],
    createdAt: '2022-04-21T13:42:17.414Z',
    createdBy: 'elastic',
    id: 'dc12f930-c178-11ec-98b5-3109bd2a1901',
  },
  {
    name: 'asxa',
    totalAlerts: 3,
    createdBy: 'elastic',
    status: CaseStatuses.closed,
    createdAt: '2022-04-21T13:41:59.025Z',
    id: 'd11cbac0-c178-11ec-98b5-3109bd2a1901',
  },
];
