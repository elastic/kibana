/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { GetHostFirstLastSeenQuery } from '../../../../graphql/types';

import { HostFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

interface MockedProvidedQuery {
  request: {
    query: GetHostFirstLastSeenQuery.Query;
    variables: GetHostFirstLastSeenQuery.Variables;
  };
  result: {
    data?: {
      source: {
        id: string;
        HostFirstLastSeen: {
          firstSeen: string | null;
          lastSeen: string | null;
        };
      };
    };
    errors?: [{ message: string }];
  };
}
export const mockFirstLastSeenHostQuery: MockedProvidedQuery[] = [
  {
    request: {
      query: HostFirstLastSeenGqlQuery,
      variables: {
        sourceId: 'default',
        hostName: 'kibana-siem',
        defaultIndex: DEFAULT_INDEX_PATTERN,
        docValueFields: [],
      },
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
