/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { Direction, EventEdges, EventItem, GetTimelineQuery, PageInfo } from '../../graphql/types';
import { inputsModel } from '../../store';
import { timelineQuery } from './index.gql_query';

export interface TimelineArgs {
  id: string;
  events: EventItem[];
  loading: boolean;
  totalCount: number;
  pageInfo: PageInfo;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children?: (args: TimelineArgs) => React.ReactNode;
  sourceId: string;
  filterQuery: string;
  poll?: number;
  limit: number;
}

export const TimelineQuery = pure<OwnProps>(
  ({ id = 'timelineQuery', children, filterQuery, sourceId, limit, poll }) => (
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
        sortField: {
          sortFieldId: 'timestamp',
          direction: 'descending' as Direction,
        },
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
          events: events.map((i: EventEdges) => i.event),
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
                    Events: {
                      ...fetchMoreResult.source.Events,
                      edges: [...prev.source.Events.edges, ...fetchMoreResult.source.Events.edges],
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
