/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { get, has } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { ActionCreator } from 'typescript-fsa';
import { Ecs, EcsEdges } from '../../../../graphql/types';
import { eventsSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue, getEmptyValue, getOrEmpty, getOrEmptyTag } from '../../../empty_value';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
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
  updateLimitPagination: ActionCreator<{ limit: number }>;
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
    limit,
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
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newLimit => updateLimitPagination({ limit: newLimit })}
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

const getEventsColumns = (startDate: number): Array<Columns<EcsEdges>> => [
  {
    name: i18n.HOST_NAME,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null = get('host.name', node);
      if (hostName != null) {
        return (
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: escapeDataProviderId(`events-table-${node._id!}-hostName-${hostName}`),
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
                to: Date.now(),
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
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.EVENT_TYPE,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }) => getOrEmptyTag('event.type', node),
  },
  {
    name: i18n.SOURCE,
    truncateText: true,
    render: ({ node }) => (
      <>
        {formatSafely('source.ip', node)} : {getOrEmpty('source.port', node)}
      </>
    ),
  },
  {
    name: i18n.DESTINATION,
    sortable: true,
    truncateText: true,
    render: ({ node }) => (
      <>
        {formatSafely('destination.ip', node)} : {getOrEmpty('destination.port', node)}
      </>
    ),
  },
  {
    name: i18n.LOCATION,
    sortable: true,
    truncateText: true,
    render: ({ node }) => (
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
