/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import {
  uncommonProcessesActions,
  uncommonProcessesSelector,
} from 'x-pack/plugins/secops/public/store/local/uncommon_processes';
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
    updateLimitPagination,
  }) => (
    <LoadMoreTable
      columns={getUncommonColumns()}
      loadingTitle="Uncommon Processes"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
      title={
        <h3>
          Uncommon Processes <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => uncommonProcessesSelector(state);

export const UncommonProcessTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: uncommonProcessesActions.updateLimitOfPagination,
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
    name: 'Number of Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{uncommonProcess.hosts != null ? uncommonProcess.hosts.length : '--'}</>
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
