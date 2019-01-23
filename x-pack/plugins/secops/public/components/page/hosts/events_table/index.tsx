/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { Ecs, EcsEdges } from '../../../../graphql/types';
import { eventsSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { getEmptyValue, getOrEmpty } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';

interface OwnProps {
  data: Ecs[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  tiebreaker: string;
  totalCount: number;
  loadMore: (cursor: string, tiebreaker: string) => void;
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
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
  {
    text: i18n.ROWS_20,
    numberOfRow: 20,
  },
  {
    text: i18n.ROWS_50,
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
    tiebreaker,
    totalCount,
    nextCursor,
    updateLimitPagination,
    startDate,
  }) => (
    <LoadMoreTable
      columns={getEventsColumns(startDate)}
      loadingTitle={i18n.EVENTS}
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor, tiebreaker)}
      limit={limit}
      hasNextPage={hasNextPage!}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => {
        updateLimitPagination({ limit: newlimit });
      }}
      title={
        <h3>
          {i18n.EVENTS} <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => eventsSelector(state);

export const EventsTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateEventsLimit,
  }
)(EventsTableComponent);

const getEventsColumns = (startDate: number) => [
  {
    name: i18n.HOST_NAME,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: EcsEdges) => {
      const hostName = getOrEmpty('host.name', node);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: node._id!,
              name: hostName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                displayField: 'host.name',
                displayValue: hostName,
                field: 'host.id',
                value: node.host!.id!,
              },
              queryDate: {
                from: startDate,
                to: moment().valueOf(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
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
    name: i18n.EVENT_TYPE,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }: EcsEdges) => <>{getOrEmpty('event.type', node)}</>,
  },
  {
    name: i18n.SOURCE,
    truncateText: true,
    render: ({ node }: EcsEdges) => (
      <>
        {formatSafely('source.ip', node)} : {getOrEmpty('source.port', node)}
      </>
    ),
  },
  {
    name: i18n.DESTINATION,
    sortable: true,
    truncateText: true,
    render: ({ node }: EcsEdges) => (
      <>
        {formatSafely('destination.ip', node)} : {getOrEmpty('destination.port', node)}
      </>
    ),
  },
  {
    name: i18n.LOCATION,
    sortable: true,
    truncateText: true,
    render: ({ node }: EcsEdges) => (
      <>
        {getOrEmpty('geo.region_name', node)} : {getOrEmpty('geo.country_iso_code', node)}
      </>
    ),
  },
];

export const formatSafely = (path: string, data: Ecs) => {
  if (has(path, data)) {
    const txt = getOrEmpty(path, data);
    return txt && txt.slice ? txt.slice(0, 12) : txt;
  }
  return getEmptyValue();
};
