/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import uuid from 'uuid';

import { GetHostFirstLastSeenQuery } from '../../../graphql/types';
import { appActions, inputsModel, store } from '../../../store';
import * as i18n from '../../errors/translations';
import { QueryTemplateProps } from '../../query_template';

import { HostFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

export interface FirstLastSeenHostArgs {
  id: string;
  firstSeen: Date;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: FirstLastSeenHostArgs) => React.ReactNode;
  hostName: string;
}

export function useFirstLastSeenHostQuery<TCache = object>(
  hostName: string,
  sourceId: string,
  apolloClient: ApolloClient<TCache>
) {
  const [loading, updateLoading] = useState(false);
  const [firstSeen, updateFirstSeen] = useState(null);
  const [lastSeen, updateLastSeen] = useState(null);

  async function fetchFirstLastSeenHost() {
    updateLoading(true);
    return apolloClient
      .query<GetHostFirstLastSeenQuery.Query, GetHostFirstLastSeenQuery.Variables>({
        query: HostFirstLastSeenGqlQuery,
        fetchPolicy: 'cache-first',
        variables: { sourceId, hostName },
      })
      .then(
        result => {
          updateLoading(false);
          updateFirstSeen(get('data.source.HostFirstLastSeen.firstSeen', result));
          updateLastSeen(get('data.source.HostFirstLastSeen.lastSeen', result));
          return result;
        },
        error => {
          store.dispatch(
            appActions.addError({
              id: uuid.v4(),
              title: i18n.NETWORK_FAILURE,
              message: error.message,
            })
          );
          updateLoading(false);
          return null;
        }
      );
  }

  useEffect(() => {
    try {
      fetchFirstLastSeenHost();
    } catch (err) {
      updateFirstSeen(null);
      updateLastSeen(null);
    }
  }, []);

  return { firstSeen, lastSeen, loading };
}
