/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions } from '../../../../store/actions';
import { Ecs, EcsEdges } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { getOrEmptyTag } from '../../../empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import * as i18n from './translations';
import { getRowItemDraggable, getRowItemDraggables } from '../../../tables/helpers';

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
      columns={getEventsColumns(type)}
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

const getEventsColumns = (
  pageType: hostsModel.HostsType
): [
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
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
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'host.name', node),
        attrName: 'host.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.EVENT_MODULE_DATASET,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }) => (
      <>
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.module', node),
          attrName: 'event.module',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
        /
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.dataset', node),
          attrName: 'event.dataset',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
      </>
    ),
  },
  {
    name: i18n.EVENT_CATEGORY,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'event.category', node),
        attrName: 'event.category',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.EVENT_ACTION,
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'event.action', node),
        attrName: 'event.action',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.USER,
    sortable: true,
    truncateText: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'user.name', node),
        attrName: 'user.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.MESSAGE,
    sortable: false,
    truncateText: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'message', node),
        attrName: 'message',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.SOURCE,
    truncateText: true,
    render: ({ node }) => (
      <>
        {getRowItemDraggable({
          rowItem: getOr(null, 'source.ip[0]', node),
          attrName: 'source.ip',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
          render: item => <IPDetailsLink ip={item} />,
        })}
        :{getOrEmptyTag('source.port', node)}
      </>
    ),
  },
  {
    name: i18n.DESTINATION,
    sortable: true,
    truncateText: true,
    render: ({ node }) => (
      <>
        {getRowItemDraggable({
          rowItem: getOr(null, 'destination.ip[0]', node),
          attrName: 'destination.ip',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
          render: item => <IPDetailsLink ip={item} />,
        })}
        :{getOrEmptyTag('destination.port', node)}
      </>
    ),
  },
];
