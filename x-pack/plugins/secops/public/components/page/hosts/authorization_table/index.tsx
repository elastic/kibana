/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import moment from 'moment';
import { AuthorizationItem, AuthorizationsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { authorizationsSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { defaultToEmpty, getEmptyValue } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

interface OwnProps {
  data: AuthorizationsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
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
    startDate,
  }) => (
    <LoadMoreTable
      columns={getAuthorizationColumns(startDate)}
      loadingTitle="Authentication Failures"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
      title={
        <h3>
          Authentication Failures <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => authorizationsSelector(state);

export const AuthorizationTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateAuthorizationsLimit,
  }
)(AuthorizationTableComponent);

const getAuthorizationColumns = (startDate: number) => [
  {
    name: 'User',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => {
      const userName = defaultToEmpty(authorization.user.name);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: authorization._id,
              name: userName!,
              negated: false,
              queryMatch: `auditd.data.acct: "${escapeQueryValue(userName!)}"`,
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
                userName
              )
            }
          />
        </>
      );
    },
  },
  {
    name: 'Failures',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultToEmpty(authorization.failures)}</>
    ),
  },
  {
    name: 'Successes',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultToEmpty(authorization.successes)}</>
    ),
  },
  {
    name: 'From',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultToEmpty(authorization.source.ip)}</>
    ),
  },
  {
    name: 'To',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{defaultToEmpty(authorization.host.name)}</>
    ),
  },
  {
    name: 'Latest',
    truncateText: false,
    hideForMobile: false,
    render: ({ authorization }: { authorization: AuthorizationItem }) => (
      <>{authorization.latest ? moment(authorization.latest).fromNow() : getEmptyValue()}</>
    ),
  },
];
