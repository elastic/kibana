/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetHostsQuery, HostsEdges, PageInfo } from '../../graphql/types';

import { connect } from 'react-redux';
import { hostsSelector, inputsModel, State } from '../../store';
import { hostsQuery } from './index.gql_query';

export interface HostsArgs {
  id: string;
  hosts: HostsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children: (args: HostsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  poll: number;
}

export interface HostsComponentReduxProps {
  limit: number;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

const HostsComponentQuery = pure<HostsProps>(
  ({ id = 'hostsQuery', children, filterQuery, sourceId, startDate, endDate, limit, poll }) => (
    <Query<GetHostsQuery.Query, GetHostsQuery.Variables>
      query={hostsQuery}
      fetchPolicy="cache-and-network"
      pollInterval={poll}
      notifyOnNetworkStatusChange
      variables={{
        id,
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
        const hosts = getOr([], 'source.Hosts.edges', data);
        return children({
          id,
          refetch,
          loading,
          totalCount: getOr(0, 'source.Hosts.totalCount', data),
          hosts,
          pageInfo: getOr({}, 'source.Hosts.pageInfo', data),
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
                      ...fetchMoreResult.source.Hosts,
                      edges: [...prev.source.Hosts.edges, ...fetchMoreResult.source.Hosts.edges],
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

const mapStateToProps = (state: State) => hostsSelector(state);

export const HostsQuery = connect(mapStateToProps)(HostsComponentQuery);
