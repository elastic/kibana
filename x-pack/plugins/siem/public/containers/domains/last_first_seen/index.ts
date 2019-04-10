/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';

import { FlowTarget, GetDomainLastFirstSeenQuery } from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { QueryTemplateProps } from '../../query_template';

import { DomainLastFirstSeenGqlQuery } from './last_first_seen.gql_query';

export interface DomainLastFirstSeenArgs {
  id: string;
  firstSeen: Date;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: DomainLastFirstSeenArgs) => React.ReactNode;
  ip: string;
  domainName: string;
  flowTarget: FlowTarget;
}

export function useDomainLastFirstSeenQuery<TCache = object>(
  ip: string,
  domainName: string,
  flowTarget: FlowTarget,
  sourceId: string,
  apolloClient: ApolloClient<TCache>
) {
  const [loading, updateLoading] = useState(false);
  const [firstSeen, updateFirstSeen] = useState(null);
  const [lastSeen, updateLastSeen] = useState(null);

  async function fetchDomainLastFirstSeen() {
    updateLoading(true);
    return apolloClient
      .query<GetDomainLastFirstSeenQuery.Query, GetDomainLastFirstSeenQuery.Variables>({
        query: DomainLastFirstSeenGqlQuery,
        fetchPolicy: 'cache-first',
        variables: { sourceId, ip, domainName, flowTarget },
      })
      .then(
        result => {
          updateLoading(false);
          updateFirstSeen(get('data.source.DomainLastFirstSeen.firstSeen', result));
          updateLastSeen(get('data.source.DomainLastFirstSeen.lastSeen', result));
          return result;
        },
        error => {
          updateFirstSeen(error.message);
          updateLastSeen(error.message);
          updateLoading(false);
          return null;
        }
      );
  }

  useEffect(() => {
    try {
      fetchDomainLastFirstSeen();
    } catch (err) {
      updateFirstSeen(null);
      updateLastSeen(null);
    }
  }, []);

  return { firstSeen, lastSeen, loading };
}
