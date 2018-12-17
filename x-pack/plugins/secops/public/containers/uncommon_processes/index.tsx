/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import {
  GetUncommonProcessesQuery,
  PageInfo,
  UncommonProcessesEdges,
} from '../../../common/graphql/types';

import { connect } from 'react-redux';
import { State } from '../../store';
import { uncommonProcessesQuery } from './index.gql_query';

export interface UncommonProcessesArgs {
  uncommonProcesses: UncommonProcessesEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
}

export interface OwnProps {
  children: (args: UncommonProcessesArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  cursor: string | null;
}

export interface UncommonProcessesComponentReduxProps {
  limit: number;
}

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps;

const UncommonProcessesComponentQuery = pure<UncommonProcessesProps>(
  ({ children, filterQuery, sourceId, startDate, endDate, limit, cursor }) => (
    <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
      query={uncommonProcessesQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: endDate,
          to: startDate,
        },
        pagination: {
          limit,
          cursor,
          tiebreaker: null,
        },
        filterQuery,
      }}
    >
      {({ data, loading, fetchMore }) =>
        children({
          loading,
          totalCount: getOr(0, 'source.UncommonProcesses.totalCount', data),
          uncommonProcesses: getOr([], 'source.UncommonProcesses.edges', data),
          pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
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
        })
      }
    </Query>
  )
);

const mapStateToProps = (state: State) => {
  // TODO: This is hard coded without a reducer and state until
  // we can determine if we can get a cursor object with the aggregate or not
  // of uncommon_processes
  const limit = 5;
  return { limit };
};

export const UncommonProcessesQuery = connect(mapStateToProps)(UncommonProcessesComponentQuery);
