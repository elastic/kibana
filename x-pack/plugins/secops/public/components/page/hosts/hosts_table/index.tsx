/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo, getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { HostItem } from '../../../../../common/graphql/types';
import { hostsActions, hostsSelector, State } from '../../../../store';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

interface OwnProps {
  data: HostItem[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
}

interface HostsTableReduxProps {
  limit: number;
}

interface HostsTableDispatchProps {
  updateLimitPagination: (param: { limit: number }) => void;
}

type HostsTableProps = OwnProps & HostsTableReduxProps & HostsTableDispatchProps;

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

const HostsTableComponent = pure<HostsTableProps>(
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
      columns={getHostsColumns()}
      loadingTitle="Hosts"
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
          Hosts <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => {
  const limit = defaultTo(2, hostsSelector(state));

  return { limit };
};

export const HostsTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateLimitOfPagination,
  }
)(HostsTableComponent);

const getHostsColumns = () => [
  {
    name: 'Host',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.name', item)}</>,
  },
  {
    name: 'First seen',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.firstSeen', item)}</>,
  },
  {
    name: 'OS',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.os', item)}</>,
  },
  {
    name: 'Version',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.version', item)}</>,
  },
];
