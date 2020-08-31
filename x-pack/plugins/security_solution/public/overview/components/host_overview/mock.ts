/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsData } from '../../../graphql/types';

export const mockData: { Hosts: HostsData; DateFields: string[] } = {
  Hosts: {
    totalCount: 1,
    edges: [
      {
        node: {
          _id: 'yneHlmgBjVl2VqDlAjPR',
          host: {
            architecture: ['x86_64'],
            id: ['aa7ca589f1b8220002f2fc61c64cfbf1'],
            ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
            mac: ['42:01:0a:8e:00:07'],
            name: ['siem-kibana'],
            os: {
              family: ['debian'],
              name: ['Debian GNU/Linux'],
              platform: ['debian'],
              version: ['9 (stretch)'],
            },
          },
          cloud: {
            instance: {
              id: ['423232333829362673777'],
            },
            machine: {
              type: ['custom-4-16384'],
            },
            provider: ['gce'],
            region: ['us-east-1'],
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      activePage: 1,
      fakeTotalCount: 50,
      showMorePagesIndicator: true,
    },
  },
  DateFields: ['lastBeat'],
};
