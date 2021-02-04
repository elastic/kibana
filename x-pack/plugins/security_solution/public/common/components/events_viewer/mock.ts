/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockEventViewerResponse = {
  totalCount: 12,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 100,
  },
  events: [],
};

export const mockEventViewerResponseWithEvents = {
  totalCount: 1,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 100,
  },
  events: [
    {
      ecs: {
        _id: 'yb8TkHYBRgU82_bJu_rY',
        timestamp: '2020-12-23T14:49:39.957Z',
        _index: 'auditbeat-7.10.1-2020.12.18-000001',
        '@timestamp': ['2020-12-23T14:49:39.957Z'],
        event: {
          module: ['system'],
          action: ['process_started'],
          category: ['process'],
          dataset: ['process'],
          kind: ['event'],
          type: ['start'],
        },
        host: {
          name: ['handsome'],
          os: {
            family: ['darwin'],
          },
          id: ['33'],
          ip: ['0.0.0.0'],
        },
        user: {
          name: ['handsome'],
        },
        message: ['Process node (PID: 77895) by user handsome STARTED'],
        agent: {
          type: ['auditbeat'],
        },
        process: {
          hash: {
            sha1: ['`12345678987654323456Y7U87654`'],
          },
          pid: ['77895'],
          name: ['node'],
          ppid: ['73537'],
          args: [
            '/Users/handsome/.nvm/versions/node/v14.15.3/bin/node',
            '/Users/handsome/Documents/workspace/kibana/node_modules/jest-worker/build/workers/processChild.js',
          ],
          entity_id: ['3arNfOyR9NwR2u03'],
          executable: ['/Users/handsome/.nvm/versions/node/v14.15.3/bin/node'],
          working_directory: ['/Users/handsome/Documents/workspace/kibana/x-pack'],
        },
      },
      data: [
        {
          field: '@timestamp',
          value: ['2020-12-23T14:49:39.957Z'],
        },
        {
          field: 'event.module',
          value: ['system'],
        },
        {
          field: 'event.action',
          value: ['process_started'],
        },
        {
          field: 'host.name',
          value: ['handsome'],
        },
        {
          field: 'user.name',
          value: ['handsome'],
        },
        {
          field: 'message',
          value: ['Process node (PID: 77895) by user handsome STARTED'],
        },
        {
          field: 'event.dataset',
          value: ['process'],
        },
      ],
      _id: 'yb8TkHYBRgU82_bJu_rY',
      _index: 'auditbeat-7.10.1-2020.12.18-000001',
    },
  ],
};
