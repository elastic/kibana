/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget } from '../../../graphql/types';

import { DomainLastFirstSeenGqlQuery } from './last_first_seen.gql_query';

interface MockedProvidedQuery {
  request: object;
  result: object;
}
export const mocksLastSeenDomainQuery: MockedProvidedQuery[] = [
  {
    request: {
      query: DomainLastFirstSeenGqlQuery,
      variables: {
        sourceId: 'default',
        ip: '10.10.10.10',
        domainName: 'example.com',
        flowTarget: FlowTarget.source,
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          DomainLastFirstSeen: {
            firstSeen: '2019-04-08T16:09:40.692Z',
            lastSeen: '2019-04-08T18:35:45.064Z',
          },
        },
      },
    },
  },
];
