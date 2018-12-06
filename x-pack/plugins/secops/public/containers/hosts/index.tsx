/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, merge } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetHostsQuery, HostItem, PageInfo } from '../../../common/graphql/types';

import { hostsQuery } from './index.gql_query';

export interface HostsArgs {
  hosts: HostItem[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string, limit: number) => void;
}

export interface HostsProps {
  children: (args: HostsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  limit: number;
  cursor: string | null;
}

export const HostsQuery = pure<HostsProps>(
  ({ children, filterQuery, sourceId, startDate, endDate, limit, cursor }) => (
    <Query<GetHostsQuery.Query, GetHostsQuery.Variables>
      query={hostsQuery}
      fetchPolicy="no-cache"
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
          totalCount: getOr(0, 'source.Hosts.totalCount', data),
          hosts: getOr([], 'source.Hosts.edges', data),
          pageInfo: getOr({}, 'source.Hosts.pageInfo', data),
          loadMore: (newCursor: string, newLimit: number) =>
            fetchMore({
              variables: {
                pagination: {
                  limit: newLimit,
                  cursor: newCursor,
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
        })
      }
    </Query>
  )
);
