/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import uuid from 'uuid';

import { FlowTarget, GetDomainFirstLastSeenQuery } from '../../../graphql/types';
import { appActions, inputsModel, store } from '../../../store';
import * as i18n from '../../errors/translations';
import { QueryTemplateProps } from '../../query_template';

import { DomainFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

export interface DomainFirstLastSeenArgs {
  id: string;
  firstSeen: Date;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: DomainFirstLastSeenArgs) => React.ReactNode;
  ip: string;
  domainName: string;
  flowTarget: FlowTarget;
}

export function useFirstLastSeenDomainQuery<TCache = object>(
  ip: string,
  domainName: string,
  flowTarget: FlowTarget,
  sourceId: string,
  apolloClient: ApolloClient<TCache>
) {
  const [loading, updateLoading] = useState(false);
  const [firstSeen, updateFirstSeen] = useState(null);
  const [lastSeen, updateLastSeen] = useState(null);

  async function fetchDomainFirstLastSeen() {
    updateLoading(true);
    return apolloClient
      .query<GetDomainFirstLastSeenQuery.Query, GetDomainFirstLastSeenQuery.Variables>({
        query: DomainFirstLastSeenGqlQuery,
        fetchPolicy: 'cache-first',
        variables: { sourceId, ip, domainName, flowTarget },
      })
      .then(
        result => {
          updateLoading(false);
          updateFirstSeen(get('data.source.DomainFirstLastSeen.firstSeen', result));
          updateLastSeen(get('data.source.DomainFirstLastSeen.lastSeen', result));
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
      fetchDomainFirstLastSeen();
    } catch (err) {
      updateFirstSeen(null);
      updateLastSeen(null);
    }
  }, []);

  return { firstSeen, lastSeen, loading };
}
