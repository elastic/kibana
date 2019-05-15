/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsData } from '../../../../graphql/types';

export const mockData: { Events: EventsData } = {
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
          _id: 'aXSdmmoB9v5HJNSHzQ0Y',
          _index: 'filebeat-8.0.0-2019.04.20-000003',
          timestamp: '2019-05-09T17:15:47.987Z',
          event: {
            action: null,
            category: null,
            dataset: ['suricata.eve'],
            id: null,
            module: ['suricata'],
            severity: [3],
          },
          host: {
            name: ['siem-kibana'],
            ip: null,
            id: ['aa7ca589f1b8220002f2fc61c64cfbf1'],
          },
          message: ['Generic Protocol Command Decode'],
          source: {
            ip: ['10.47.2.208'],
            port: [110],
          },
          destination: {
            ip: ['10.0.0.111'],
            port: [37140],
          },
          suricata: {
            eve: {
              proto: null,
              flow_id: [1026250231579890],
              alert: {
                signature: ['SURICATA SMTP no server welcome message'],
                signature_id: [2220006],
              },
            },
          },
          user: null,
          zeek: null,
        },
      },
      {
        cursor: {
          value: '1546878704036',
          tiebreaker: '10624',
        },

        node: {
          _id: 'aHSdmmoB9v5HJNSHzQ0Y',
          _index: 'filebeat-8.0.0-2019.04.20-000003',
          timestamp: '2019-05-09T17:15:47.604Z',
          event: {
            action: null,
            category: null,
            dataset: ['suricata.eve'],
            id: null,
            module: ['suricata'],
            severity: [1],
          },
          host: {
            name: ['siem-kibana'],
            ip: null,
            id: ['aa7ca589f1b8220002f2fc61c64cfbf1'],
          },
          message: ['A Network Trojan was detected'],
          source: {
            ip: ['10.47.6.59'],
            port: [41155],
          },
          destination: {
            ip: ['10.225.222.243'],
            port: [8080],
          },
          suricata: {
            eve: {
              proto: null,
              flow_id: [2102212323729057],
              alert: {
                signature: ['ET TROJAN Generic - POST To .php w/Extended ASCII Characters'],
                signature_id: [2017259],
              },
            },
          },
          user: null,
          zeek: null,
        },
      },
    ],
  },
};
