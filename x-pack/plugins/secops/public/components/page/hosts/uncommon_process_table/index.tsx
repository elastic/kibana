/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo, noop } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { UncommonProcessesEdges, UncommonProcessItem } from '../../../../../common/graphql/types';

import { State } from '../../../../store';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

interface OwnProps {
  data: UncommonProcessesEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
}

interface UncommonProcessTableReduxProps {
  limit: number;
}

interface UncommonProcessTableDispatchProps {
  updateLimitPagination: (param: { limit: number }) => void;
}

type UncommonProcessTableProps = OwnProps &
  UncommonProcessTableReduxProps &
  UncommonProcessTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: '2 rows',
    numberOfRow: 2,
  },
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

const UncommonProcessTableComponent = pure<UncommonProcessTableProps>(
  ({
    data,
    hasNextPage,
    limit,
    loading,
    loadMore,
    totalCount,
    nextCursor,
    updateLimitPagination, // TODO: Remove this if we cannot do pagination with uncommon process
  }) => (
    <LoadMoreTable
      columns={getUncommonColumns()}
      loadingTitle="Uncommon Processes"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage!}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => {
        // TODO: Update this with pagination if we can get it to work with this widget
        // with a cursor
        // updateLimitPagination({ limit: newlimit });
      }}
      title={
        <h3>
          Uncommon Processes <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => {
  // TODO: This is hard coded without a reducer and state until
  // we can determine if we can get a cursor object with the aggregate or not
  // of uncommon_processes
  const limit = 5;
  return { limit };
};

export const UncommonProcessTable = connect(
  mapStateToProps,
  {
    // TODO: Update this with pagination if we can get it to work
    // updateLimitPagination: hostsActions.updateLimitOfPagination,
    updateLimitPagination: noop,
  }
)(UncommonProcessTableComponent);

const getUncommonColumns = () => [
  {
    name: 'Process Name',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultTo('--', uncommonProcess.name)}</>
    ),
  },
  {
    name: 'Command Line',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultTo('--', uncommonProcess.title)}</>
    ),
  },
  {
    name: 'Number of Instances',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultTo('--', uncommonProcess.instances)}</>
    ),
  },
  {
    name: 'Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultTo('--', uncommonProcess.hosts)}</>
    ),
  },
];
