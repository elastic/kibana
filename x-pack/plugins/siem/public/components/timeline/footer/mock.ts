/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsTimelineData } from '../../../graphql/types';

export const mockData: { Events: EventsTimelineData } = {
  Events: {
    totalCount: 15546,
    pageInfo: {
      hasNextPage: true,
      endCursor: {
        value: '1546878704036',
        tiebreaker: '10624',
      },
    },
    edges: [
      {
        cursor: {
          value: '1546878704036',
          tiebreaker: '10656',
        },
        node: {
          _id: 'Fo8nKWgBiyhPd5Zo3cib',
          timestamp: '2019-01-07T16:31:44.036Z',
          _index: 'auditbeat-7.0.0-2019.01.07',
          destination: {
            ip: ['24.168.54.169'],
            port: [62123],
          },
          event: {
            category: null,
            id: null,
            module: ['system'],
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: ['siem-general'],
            ip: null,
          },
          source: {
            ip: ['10.142.0.6'],
            port: [9200],
          },
          suricata: null,
        },
      },
      {
        cursor: {
          value: '1546878704036',
          tiebreaker: '10624',
        },
        node: {
          _id: 'F48nKWgBiyhPd5Zo3cib',
          timestamp: '2019-01-07T16:31:44.036Z',
          _index: 'auditbeat-7.0.0-2019.01.07',
          destination: {
            ip: ['24.168.54.169'],
            port: [62145],
          },
          event: {
            category: null,
            id: null,
            module: ['system'],
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: ['siem-general'],
            ip: null,
          },
          source: {
            ip: ['10.142.0.6'],
            port: [9200],
          },
          suricata: null,
        },
      },
    ],
  },
};
