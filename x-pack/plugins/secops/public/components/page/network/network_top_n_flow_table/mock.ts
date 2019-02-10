/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowData } from '../../../../graphql/types';

export const mockData: { NetworkTopNFlow: NetworkTopNFlowData } = {
  NetworkTopNFlow: {
    totalCount: 524,
    edges: [
      {
        node: {
          source: {
            ip: '10.100.7.198',
            domain: 'nest-frontdoor.iot.sr.local.crowbird.com',
          },
          destination: null,
          event: {
            duration: 84712891000000,
          },
          network: {
            bytes: 3826633497,
            packets: 4185805,
          },
        },
        cursor: {
          value: '10.100.7.198',
        },
      },
      {
        node: {
          source: {
            ip: '54.192.48.92',
            domain: 'server-54-192-48-92.jfk5.r.cloudfront.net',
          },
          destination: null,
          event: {
            duration: 602171000000,
          },
          network: {
            bytes: 325909849,
            packets: 221494,
          },
        },
        cursor: {
          value: '54.192.48.92',
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: '10',
      },
      hasNextPage: true,
    },
  },
};
