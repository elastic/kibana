/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { EventItem, GetEventsQuery, KpiItem } from '../../../common/graphql/types';

import { eventsQuery } from './events.gql_query';

interface EventsArgs {
  events: EventItem[];
  kpiEventType: KpiItem[];
  loading: boolean;
}

interface EventsProps {
  children: (args: EventsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
}

export const EventsQuery = pure<EventsProps>(
  ({ children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetEventsQuery.Query, GetEventsQuery.Variables>
      query={eventsQuery}
      fetchPolicy="no-cache"
      notifyOnNetworkStatusChange
      variables={{
        filterQuery,
        sourceId,
        timerange: {
          interval: '12h',
          from: endDate,
          to: startDate,
        },
      }}
    >
      {({ data, loading }) =>
        children({
          loading,
          events: getOr([], 'source.getEvents.events', data),
          kpiEventType: getOr([], 'source.getEvents.kpiEventType', data),
        })
      }
    </Query>
  )
);
