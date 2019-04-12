/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

interface MockedProvidedQuery {
  request: object;
  result: object;
}
export const mockFirstLastSeenHostQuery: MockedProvidedQuery[] = [
  {
    request: {
      query: HostFirstLastSeenGqlQuery,
      variables: { sourceId: 'default', hostName: 'kibana-siem' },
    },
    result: {
      data: {
        source: {
          id: 'default',
          HostFirstLastSeen: {
            firstSeen: '2019-04-08T16:09:40.692Z',
            lastSeen: '2019-04-08T18:35:45.064Z',
          },
        },
      },
    },
  },
];
