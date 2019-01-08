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

import { AuthorizationItem, AuthorizationsEdges, HostEcsFields } from '../../../../graphql/types';
// TODO: Change out uncommonProcessLimitSelector for AuthorizedLimitSelector
import { hostsActions, State, uncommonProcessesLimitSelector } from '../../../../store';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

interface OwnProps {
  data: AuthorizationsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
}

interface AuthorizationTableReduxProps {
  limit: number;
}

interface AuthorizationTableDispatchProps {
  updateLimitPagination: (param: { limit: number }) => void;
}

type AuthorizationTableProps = OwnProps &
  AuthorizationTableReduxProps &
  AuthorizationTableDispatchProps;

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

const AuthorizationTableComponent = pure<AuthorizationTableProps>(
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
      columns={getAuthorizedColumns()}
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

const mapStateToProps = (state: State) => uncommonProcessesLimitSelector(state);

// TODO: Change this action to be updateAuthorizationLimit
export const AuthorizationTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateUncommonProcessesLimit,
  }
)(AuthorizationTableComponent);

// TODO: Remove this function and replace it with authorized code running
const extractHostNames = (hosts: HostEcsFields[]) => hosts.map(host => host.name).join(', ');

const getAuthorizedColumns = () => [
  {
    name: 'Process Name',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorized }: { authorized: AuthorizationItem }) => (
      <>{defaultTo('--', authorized.name)}</>
    ),
  },
  {
    name: 'Command Line',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorized }: { authorized: AuthorizationItem }) => (
      <>{defaultTo('--', authorized.title)}</>
    ),
  },
  {
    name: 'Number of Instances',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorized }: { authorized: AuthorizationItem }) => (
      <>{defaultTo('--', authorized.instances)}</>
    ),
  },
  {
    name: 'Number of Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorized }: { authorized: AuthorizationItem }) => (
      <>{authorized.hosts != null ? authorized.hosts.length : '--'}</>
    ),
  },
  {
    name: 'Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorized }: { authorized: AuthorizationItem }) => (
      <>{authorized.hosts != null ? extractHostNames(authorized.hosts) : '--'}</>
    ),
  },
];
