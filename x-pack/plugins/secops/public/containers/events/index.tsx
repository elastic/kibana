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
import { Direction, Ecs, GetEventsQuery, PageInfo } from '../../graphql/types';
import { hostsSelectors, inputsModel, State } from '../../store';
import { createFilter } from '../helpers';
import { eventsQuery } from './index.gql_query';

export interface EventsArgs {
  id: string;
  events: Ecs[];
  loading: boolean;
  loadMore: (cursor: string, tiebreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps {
  children?: (args: EventsArgs) => React.ReactNode;
  filterQuery?: ESQuery | string;
  id?: string;
  poll: number;
  sourceId: string;
  startDate: number;
  endDate: number;
}

export interface EventsComponentReduxProps {
  limit: number;
}

type EventsProps = OwnProps & EventsComponentReduxProps;

const EventsComponentQuery = pure<EventsProps>(
  ({ children, filterQuery, id = 'eventsQuery', limit, poll, sourceId, startDate, endDate }) => (
    <Query<GetEventsQuery.Query, GetEventsQuery.Variables>
      query={eventsQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      pollInterval={poll}
      variables={{
        filterQuery: createFilter(filterQuery),
        sourceId,
        pagination: {
          limit,
          cursor: null,
          tiebreaker: null,
        },
        sortField: {
          sortFieldId: 'timestamp',
          direction: Direction.descending,
        },
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
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
          events,
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
        });
      }}
    </Query>
  )
);

const mapStateToProps = (state: State) => hostsSelectors.eventsSelector(state);

export const EventsQuery = connect(mapStateToProps)(EventsComponentQuery);
