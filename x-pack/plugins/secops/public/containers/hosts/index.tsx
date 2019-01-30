/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocumentNode } from 'graphql';
import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { ESQuery } from '../../../common/typed_json';
import { GetHostsTableQuery, GetHostSummaryQuery, HostsEdges, PageInfo } from '../../graphql/types';
import { hostsSelector, inputsModel, State } from '../../store';
import { createFilter } from '../helpers';

export interface HostsArgs {
  id: string;
  hosts: HostsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface OwnProps {
  id?: string;
  query: DocumentNode;
  children: (args: HostsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: ESQuery | string;
  poll: number;
}

export interface HostsComponentReduxProps {
  limit: number;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

const HostsComponentQuery = pure<HostsProps>(
  ({
    id = 'hostsQuery',
    query,
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    poll,
  }) => (
    <Query<
      GetHostsTableQuery.Query | GetHostSummaryQuery.Query,
      GetHostsTableQuery.Variables | GetHostSummaryQuery.Variables
    >
      query={query}
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
        filterQuery: createFilter(filterQuery),
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
          startDate,
          endDate,
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
