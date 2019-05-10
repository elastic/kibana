/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions } from '../../../../store/actions';
import { Ecs, EcsEdges } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyStringTag, getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
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
  type: hostsModel.HostsType;
}

interface EventsTableReduxProps {
  limit: number;
}

interface EventsTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
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
    type,
  }) => (
    <LoadMoreTable
      columns={getEventsColumns()}
      hasNextPage={hasNextPage}
      headerCount={totalCount}
      headerTitle={i18n.EVENTS}
      headerUnit={i18n.UNIT(totalCount)}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadingTitle={i18n.EVENTS}
      loadMore={() => loadMore(nextCursor, tiebreaker)}
      pageOfItems={data}
      updateLimitPagination={newLimit =>
        updateLimitPagination({ limit: newLimit, hostsType: type })
      }
    />
  )
);

const makeMapStateToProps = () => {
  const getEventsSelector = hostsSelectors.eventsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getEventsSelector(state, type);
  };
  return mapStateToProps;
};

export const EventsTable = connect(
  makeMapStateToProps,
  {
    updateLimitPagination: hostsActions.updateEventsLimit,
  }
)(EventsTableComponent);

const getEventsColumns = (): [
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>
] => [
  {
    name: i18n.HOST_NAME,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null | undefined = get('host.name[0]', node);
      if (hostName != null) {
        const id = escapeDataProviderId(`events-table-${node._id}-hostName-${hostName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: hostName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'host.name',
                value: hostName,
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
    name: i18n.EVENT_ACTION,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }) => getOrEmptyTag('event.action', node),
  },
  {
    name: i18n.SOURCE,
    truncateText: true,
    render: ({ node }) => (
      <>
        {formatIpSafely('source.ip[0]', node)}:{getOrEmptyTag('source.port', node)}
      </>
    ),
  },
  {
    name: i18n.DESTINATION,
    sortable: true,
    truncateText: true,
    render: ({ node }) => (
      <>
        {formatIpSafely('destination.ip[0]', node)}:{getOrEmptyTag('destination.port', node)}
      </>
    ),
  },
  {
    name: i18n.LOCATION,
    sortable: true,
    truncateText: true,
    render: ({ node }) => (
      <>
        {getOrEmptyTag('geo.region_name', node)} : {getOrEmptyTag('geo.country_iso_code', node)}
      </>
    ),
  },
];

export const formatIpSafely = (path: string, data: Ecs): JSX.Element => {
  if (has(path, data)) {
    const txt = get(path, data);
    if (txt === '') {
      return getEmptyStringTag();
    } else {
      const ip = txt && txt.slice ? txt.slice(0, 45) : txt;
      return <IPDetailsLink ip={ip} />;
    }
  }
  return getEmptyTagValue();
};
