/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isEmpty, set } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { AuthorizationsEdges, GetAuthorizationQuery, PageInfo } from '../../graphql/types';

import { connect } from 'react-redux';
import { inputsModel, State } from '../../store';

// TODO: Change this out for unauthorized selector
import { uncommonProcessesLimitSelector } from '../../store';

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
  cursor: string | null;
  poll: number;
}

export interface AuthorizationsComponentReduxProps {
  limit: number;
  upperLimit: number;
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
    upperLimit,
    cursor,
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
          limit: upperLimit,
          cursor,
          tiebreaker: null,
        },
        filterQuery,
      }}
    >
      {({ data, loading, fetchMore, refetch }) => {
        console.log('The data is:', data);

        const authorizations = getOr([], 'source.Authorizations.edges', data);
        console.log('The authorizations are', authorizations);
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
                    Hosts: {
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

export const hasMoreData = (
  limit: number,
  upperLimit: number,
  data: AuthorizationsEdges[]
): boolean => limit < upperLimit && limit < data.length;

// TODO: Change this out for authorization
const mapStateToProps = (state: State) => uncommonProcessesLimitSelector(state);

export const AuthorizationQuery = connect(mapStateToProps)(AuthorizationsComponentQuery);
