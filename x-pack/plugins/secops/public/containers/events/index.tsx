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
import { inputsModel } from '../../store';
import { eventsQuery } from './index.gql_query';

export interface EventsArgs {
  id: string;
  events?: EventItem[];
  kpiEventType?: KpiItem[];
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface EventsProps {
  id?: string;
  children?: (args: EventsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
}

export const EventsQuery = pure<EventsProps>(
  ({ id = 'eventsQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetEventsQuery.Query, GetEventsQuery.Variables>
      query={eventsQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      variables={{
        filterQuery,
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      }}
    >
      {({ data, loading, refetch }) => {
        const events = getOr([], 'source.getEvents.events', data);
        const kpiEventType = getOr([], 'source.getEvents.kpiEventType', data);
        return children!({
          id,
          refetch,
          loading,
          events,
          kpiEventType,
        });
      }}
    </Query>
  )
);
