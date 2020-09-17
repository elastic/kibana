/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { GetLastEventTimeQuery, LastEventIndexKey } from '../../../../graphql/types';

import { LastEventTimeGqlQuery } from './last_event_time.gql_query';

interface MockLastEventTimeQuery {
  request: {
    query: GetLastEventTimeQuery.Query;
    variables: GetLastEventTimeQuery.Variables;
  };
  result: {
    data?: {
      source: {
        id: string;
        LastEventTime: {
          lastSeen: string | null;
          errorMessage: string | null;
        };
      };
    };
    errors?: [{ message: string }];
  };
}

const getTimeTwelveMinutesAgo = () => {
  const d = new Date();
  const ts = d.getTime();
  const twelveMinutes = ts - 12 * 60 * 1000;
  return new Date(twelveMinutes).toISOString();
};

export const mockLastEventTimeQuery: MockLastEventTimeQuery[] = [
  {
    request: {
      query: LastEventTimeGqlQuery,
      variables: {
        sourceId: 'default',
        indexKey: LastEventIndexKey.hosts,
        details: {},
        defaultIndex: DEFAULT_INDEX_PATTERN,
        docValueFields: [],
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          LastEventTime: {
            lastSeen: getTimeTwelveMinutesAgo(),
            errorMessage: null,
          },
        },
      },
    },
  },
];
