/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { AuthorizationsEdges, GetAuthorizationQuery, PageInfo } from '../../graphql/types';

import { connect } from 'react-redux';
import { inputsModel, State } from '../../store';
import { authorizationsLimitSelector } from '../../store';
import { authorizationQuery } from './index.gql_query';

export interface AuthorizationArgs {
  id: string;
  authorizations: AuthorizationsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children: (args: AuthorizationArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  poll: number;
}

export interface AuthorizationsComponentReduxProps {
  limit: number;
}

type AuthorizationsProps = OwnProps & AuthorizationsComponentReduxProps;

const AuthorizationsComponentQuery = pure<AuthorizationsProps>(
  ({
    id = 'authorizationQuery',
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    poll,
  }) => (
    <Query<GetAuthorizationQuery.Query, GetAuthorizationQuery.Variables>
      query={authorizationQuery}
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
        const authorizations = getOr([], 'source.Authorizations.edges', data);
        return children({
          id,
          refetch,
          loading,
          totalCount: getOr(0, 'source.Authorizations.totalCount', data),
          authorizations,
          pageInfo: getOr({}, 'source.Authorizations.pageInfo', data),
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
                    Authorizations: {
                      ...fetchMoreResult.source.Authorizations,
                      edges: [
                        ...prev.source.Authorizations.edges,
                        ...fetchMoreResult.source.Authorizations.edges,
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

const mapStateToProps = (state: State) => authorizationsLimitSelector(state);

export const AuthorizationQuery = connect(mapStateToProps)(AuthorizationsComponentQuery);
