/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { getOr, noop } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { EventItem } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { eventsLimitSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

interface OwnProps {
  data: EventItem[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
}

interface EventsTableReduxProps {
  limit: number;
}

interface EventsTableDispatchProps {
  updateLimitPagination: (param: { limit: number }) => void;
}

type EventsTableProps = OwnProps & EventsTableReduxProps & EventsTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: '5 rows',
    numberOfRow: 5,
  },
  {
    text: '10 rows',
    numberOfRow: 10,
  },
  {
    text: '20 rows',
    numberOfRow: 20,
  },
  {
    text: '50 rows',
    numberOfRow: 50,
  },
];

const EventsTableComponent = pure<EventsTableProps>(
  ({
    data,
    hasNextPage,
    limit = 5,
    loading,
    loadMore,
    totalCount,
    nextCursor,
    updateLimitPagination,
    startDate,
  }) => (
    <LoadMoreTable
      columns={getEventsColumns(startDate)}
      loadingTitle="Events"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage!}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => {
        updateLimitPagination({ limit: newlimit });
      }}
      title={
        <h3>
          Events <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => eventsLimitSelector(state);

export const EventsTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateEventsLimit,
  }
)(EventsTableComponent);

const getEventsColumns = (startDate: number) => [
  {
    name: 'Host name',
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: ({ event }: { event: EventItem }) => {
      const hostName = getOr('--', 'host.name', event);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: `${event._id}`,
              name: hostName,
              negated: false,
              queryMatch: `host.name: "${escapeQueryValue(hostName)}"`,
              queryDate: `@timestamp >= ${startDate} and @timestamp <= ${moment().valueOf()}`,
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider
                    dataProvider={dataProvider}
                    onDataProviderRemoved={noop}
                    onToggleDataProviderEnabled={noop}
                  />
                </DragEffects>
              ) : (
                hostName
              )
            }
          />
        </>
      );
    },
  },
  {
    name: 'Event type',
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ event }: { event: EventItem }) => <>{getOr('--', 'event.type', event)}</>,
  },
  {
    name: 'Source',
    truncateText: true,
    render: ({ event }: { event: EventItem }) => (
      <>
        {getOr('--', 'source.ip', event).slice(0, 12)} : {getOr('--', 'source.port', event)}
      </>
    ),
  },
  {
    name: 'Destination',
    sortable: true,
    truncateText: true,
    render: ({ event }: { event: EventItem }) => (
      <>
        {getOr('--', 'destination.ip', event).slice(0, 12)} :{' '}
        {getOr('--', 'destination.port', event)}
      </>
    ),
  },
  {
    name: 'Location',
    sortable: true,
    truncateText: true,
    render: ({ event }: { event: EventItem }) => (
      <>
        {getOr('--', 'geo.region_name', event)} : {getOr('--', 'geo.country_iso_code', event)}
      </>
    ),
  },
];
