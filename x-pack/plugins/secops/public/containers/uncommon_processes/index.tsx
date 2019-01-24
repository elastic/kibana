/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetUncommonProcessesQuery, PageInfo, UncommonProcessesEdges } from '../../graphql/types';

import { connect } from 'react-redux';
import { inputsModel, State } from '../../store';
import { uncommonProcessesSelector } from '../../store';
import { uncommonProcessesQuery } from './index.gql_query';

export interface UncommonProcessesArgs {
  id: string;
  uncommonProcesses: UncommonProcessesEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children: (args: UncommonProcessesArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  cursor: string | null;
  poll: number;
}

export interface UncommonProcessesComponentReduxProps {
  limit: number;
}

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps;

const UncommonProcessesComponentQuery = pure<UncommonProcessesProps>(
  ({
    id = 'uncommonProcessesQuery',
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    cursor,
    poll,
  }) => (
    <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
      query={uncommonProcessesQuery}
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
          cursor,
          tiebreaker: null,
        },
        filterQuery,
      }}
    >
      {({ data, loading, fetchMore, refetch }) => {
        const uncommonProcesses = getOr([], 'source.UncommonProcesses.edges', data);
        return children({
          id,
          loading,
          refetch,
          totalCount: getOr(0, 'source.UncommonProcesses.totalCount', data),
          uncommonProcesses,
          pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
          loadMore: (newCursor: string) =>
            fetchMore({
              variables: {
                pagination: {
                  cursor: newCursor,
                  limit: limit + parseInt(newCursor, 10),
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
                    UncommonProcesses: {
                      ...fetchMoreResult.source.UncommonProcesses,
                      edges: [
                        ...prev.source.UncommonProcesses.edges,
                        ...fetchMoreResult.source.UncommonProcesses.edges,
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

const mapStateToProps = (state: State) => uncommonProcessesSelector(state);

export const UncommonProcessesQuery = connect(mapStateToProps)(UncommonProcessesComponentQuery);
