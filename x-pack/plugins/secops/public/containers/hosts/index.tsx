/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { GetHostsTableQuery, GetHostSummaryQuery, HostsEdges, PageInfo } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

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

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface HostsComponentReduxProps {
  limit: number;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

class HostsComponentQuery extends QueryTemplate<
  HostsProps,
  GetHostsTableQuery.Query | GetHostSummaryQuery.Query,
  GetHostsTableQuery.Variables | GetHostSummaryQuery.Variables
> {
  public render() {
    const {
      id = 'hostsQuery',
      children,
      filterQuery,
      sourceId,
      startDate,
      endDate,
      limit,
      poll,
      type,
    } = this.props;
    return (
      <Query<
        GetHostsTableQuery.Query | GetHostSummaryQuery.Query,
        GetHostsTableQuery.Variables | GetHostSummaryQuery.Variables
      >
        query={type === hostsModel.HostsType.page ? HostsTableQuery : HostSummaryQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        pollInterval={poll}
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
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
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string) => ({
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
                  Hosts: {
                    ...fetchMoreResult.source.Hosts,
                    edges: [...prev.source.Hosts.edges, ...fetchMoreResult.source.Hosts.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            refetch,
            loading,
            totalCount: getOr(0, 'source.Hosts.totalCount', data),
            hosts,
            startDate: startDate!,
            endDate: endDate!,
            pageInfo: getOr({}, 'source.Hosts.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getHostsSelector(state, type);
  };
  return mapStateToProps;
};

export const HostsQuery = connect(makeMapStateToProps)(HostsComponentQuery);
