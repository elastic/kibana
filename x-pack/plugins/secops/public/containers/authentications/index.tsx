/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { AuthenticationsEdges, GetAuthenticationsQuery, PageInfo } from '../../graphql/types';

import { connect } from 'react-redux';
import { inputsModel, State } from '../../store';
import { authenticationsSelector } from '../../store';
import { authenticationsQuery } from './index.gql_query';

export interface AuthenticationArgs {
  id: string;
  authentications: AuthenticationsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children: (args: AuthenticationArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  poll: number;
}

export interface AuthenticationsComponentReduxProps {
  limit: number;
}

type AuthenticationsProps = OwnProps & AuthenticationsComponentReduxProps;

const AuthenticationsComponentQuery = pure<AuthenticationsProps>(
  ({
    id = 'authenticationQuery',
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    poll,
  }) => (
    <Query<GetAuthenticationsQuery.Query, GetAuthenticationsQuery.Variables>
      query={authenticationsQuery}
      fetchPolicy="cache-and-network"
      pollInterval={poll}
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        pagination: {
          limit,
          cursor: null,
          tiebreaker: null,
        },
        filterQuery,
      }}
    >
      {({ data, loading, fetchMore, refetch }) => {
        const authentications = getOr([], 'source.Authentications.edges', data);
        return children({
          id,
          refetch,
          loading,
          totalCount: getOr(0, 'source.Authentications.totalCount', data),
          authentications,
          pageInfo: getOr({}, 'source.Authentications.pageInfo', data),
          loadMore: (newCursor: string) =>
            fetchMore({
              variables: {
                pagination: {
                  cursor: newCursor,
                  limit,
                },
              },
              updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) {
                  return prev;
                }
                return {
                  ...fetchMoreResult,
                  source: {
                    ...fetchMoreResult.source,
                    Authentications: {
                      ...fetchMoreResult.source.Authentications,
                      edges: [
                        ...prev.source.Authentications.edges,
                        ...fetchMoreResult.source.Authentications.edges,
                      ],
                    },
                  },
                };
              },
            }),
        });
      }}
    </Query>
  )
);

const mapStateToProps = (state: State) => authenticationsSelector(state);

export const AuthenticationsQuery = connect(mapStateToProps)(AuthenticationsComponentQuery);
