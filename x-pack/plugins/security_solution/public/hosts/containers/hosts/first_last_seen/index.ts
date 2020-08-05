/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { GetHostFirstLastSeenQuery } from '../../../../graphql/types';
import { inputsModel } from '../../../../common/store';
import { QueryTemplateProps } from '../../../../common/containers/query_template';
import { useWithSource } from '../../../../common/containers/source';
import { HostFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

export interface FirstLastSeenHostArgs {
  id: string;
  errorMessage: string;
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
  const [firstSeen, updateFirstSeen] = useState<Date | null>(null);
  const [lastSeen, updateLastSeen] = useState<Date | null>(null);
  const [errorMessage, updateErrorMessage] = useState<string | null>(null);
  const [defaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const { docValueFields } = useWithSource(sourceId);

  async function fetchFirstLastSeenHost(signal: AbortSignal) {
    updateLoading(true);
    return apolloClient
      .query<GetHostFirstLastSeenQuery.Query, GetHostFirstLastSeenQuery.Variables>({
        query: HostFirstLastSeenGqlQuery,
        fetchPolicy: 'cache-first',
        variables: {
          sourceId,
          hostName,
          defaultIndex,
          docValueFields,
        },
        context: {
          fetchOptions: {
            signal,
          },
        },
      })
      .then(
        (result) => {
          updateLoading(false);
          updateFirstSeen(get('data.source.HostFirstLastSeen.firstSeen', result));
          updateLastSeen(get('data.source.HostFirstLastSeen.lastSeen', result));
          updateErrorMessage(null);
        },
        (error) => {
          updateLoading(false);
          updateFirstSeen(null);
          updateLastSeen(null);
          updateErrorMessage(error.message);
        }
      );
  }

  useEffect(() => {
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;
    fetchFirstLastSeenHost(signal);
    return () => abortCtrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { firstSeen, lastSeen, loading, errorMessage };
}
