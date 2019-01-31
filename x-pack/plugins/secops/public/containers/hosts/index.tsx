/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { ESQuery } from '../../../common/typed_json';
import { GetHostsTableQuery, GetHostSummaryQuery, HostsEdges, PageInfo } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State } from '../../store';
import { createFilter } from '../helpers';
import { HostSummaryQuery } from './host_summary.gql_query';
import { HostsTableQuery } from './hosts_table.gql_query';

export { HostsFilter } from './filter';

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
  children: (args: HostsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: ESQuery | string;
  poll: number;
  type: hostsModel.HostsType;
}

export interface HostsComponentReduxProps {
  limit: number;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

const HostsComponentQuery = pure<HostsProps>(
  ({
    id = 'hostsQuery',
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    poll,
    type,
  }) => (
    <Query<
      GetHostsTableQuery.Query | GetHostSummaryQuery.Query,
      GetHostsTableQuery.Variables | GetHostSummaryQuery.Variables
    >
      query={type === hostsModel.HostsType.page ? HostsTableQuery : HostSummaryQuery}
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

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getHostsSelector(state, type);
  };
  return mapStateToProps;
};

export const HostsQuery = connect(makeMapStateToProps)(HostsComponentQuery);
