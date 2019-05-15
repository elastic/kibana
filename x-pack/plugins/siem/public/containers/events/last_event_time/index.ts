/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';

import { GetLastEventTimeQuery, LastEventIndexKey, LastTimeDetails } from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { QueryTemplateProps } from '../../query_template';

import { LastEventTimeGqlQuery } from './last_event_time.gql_query';

export interface LastEventTimeArgs {
  id: string;
  errorMessage: string;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: LastEventTimeArgs) => React.ReactNode;
  indexKey: LastEventIndexKey;
}

export function useLastEventTimeQuery<TCache = object>(
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  sourceId: string,
  apolloClient: ApolloClient<TCache>
) {
  const [loading, updateLoading] = useState(false);
  const [lastSeen, updateLastSeen] = useState(null);
  const [errorMessage, updateErrorMessage] = useState(null);
  const [currentIndexKey, updateCurrentIndexKey] = useState(null);
  async function fetchLastEventTime() {
    updateLoading(true);
    return apolloClient
      .query<GetLastEventTimeQuery.Query, GetLastEventTimeQuery.Variables>({
        query: LastEventTimeGqlQuery,
        fetchPolicy: 'cache-first',
        variables: { sourceId, indexKey, details },
      })
      .then(
        result => {
          updateLoading(false);
          updateLastSeen(get('data.source.LastEventTime.lastSeen', result));
          updateErrorMessage(null);
          updateCurrentIndexKey(currentIndexKey);
          return result;
        },
        error => {
          updateLoading(false);
          updateErrorMessage(error.message);
          return error;
        }
      );
  }

  useEffect(
    () => {
      try {
        fetchLastEventTime();
      } catch (err) {
        updateLastSeen(null);
        updateErrorMessage(err.toString());
      }
    },
    [indexKey, details.hostName, details.ip]
  );

  return { lastSeen, loading, errorMessage };
}
