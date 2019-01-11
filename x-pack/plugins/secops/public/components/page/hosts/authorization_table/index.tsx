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

import moment from 'moment';
import { AuthorizationItem, AuthorizationsEdges } from '../../../../graphql/types';
import { authorizationsLimitSelector, hostsActions, State } from '../../../../store';
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
      loadingTitle="Top Authentication Failures"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
      title={
        <h3>
          Top Authentication Failures <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => authorizationsLimitSelector(state);

export const AuthorizationTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateAuthorizationsLimit,
  }
)(AuthorizationTableComponent);

const getAuthorizedColumns = () => [
  {
    name: 'Failures',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', authorization.failures)}</>
    ),
  },
  {
    name: 'Successes',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', authorization.successes)}</>
    ),
  },
  {
    name: 'User',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', authorization.user)}</>
    ),
  },
  {
    name: 'From',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', authorization.from)}</>
    ),
  },
  {
    name: 'To',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', authorization.to.name)}</>
    ),
  },
  {
    name: 'Latest',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultTo('--', moment(authorization.latest).fromNow())}</>
    ),
  },
];
