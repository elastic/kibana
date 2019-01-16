/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { Ecs, EcsEdges, GetTimelineQuery, PageInfo, SortField } from '../../graphql/types';
import { inputsModel } from '../../store';
import { timelineQuery } from './index.gql_query';

export interface TimelineArgs {
  events: Ecs[];
  id: string;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  updatedAt: number;
}

export interface OwnProps {
  children?: (args: TimelineArgs) => React.ReactNode;
  id?: string;
  limit: number;
  filterQuery: string;
  poll?: number;
  sortField: SortField;
  sourceId: string;
}

export const TimelineQuery = pure<OwnProps>(
  ({ children, id = 'timelineQuery', limit, filterQuery, poll, sourceId, sortField }) => (
    <Query<GetTimelineQuery.Query, GetTimelineQuery.Variables>
      query={timelineQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      pollInterval={poll}
      variables={{
        filterQuery,
        sourceId,
        pagination: {
          limit,
          cursor: null,
          tiebreaker: null,
        },
        sortField,
      }}
    >
      {({ data, loading, fetchMore, refetch }) => {
        const events = getOr([], 'source.Events.edges', data);
        return children!({
          id,
          refetch,
          loading,
          totalCount: getOr(0, 'source.Events.totalCount', data),
          pageInfo: getOr({}, 'source.Events.pageInfo', data),
          events: events.map((i: EcsEdges) => i.node),
          loadMore: (newCursor: string, tiebreaker: string) =>
            fetchMore({
              variables: {
                pagination: {
                  cursor: newCursor,
                  tiebreaker,
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
                    Events: {
                      ...fetchMoreResult.source.Events,
                      edges: [...prev.source.Events.edges, ...fetchMoreResult.source.Events.edges],
                    },
                  },
                };
              },
            }),
          updatedAt: moment().valueOf(),
        });
      }}
    </Query>
  )
);
