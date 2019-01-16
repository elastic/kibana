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
import { AuthenticationsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { authenticationsSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { defaultToEmpty, getEmptyValue } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

interface OwnProps {
  data: AuthenticationsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
}

interface AuthenticationTableReduxProps {
  limit: number;
}

interface AuthenticationTableDispatchProps {
  updateLimitPagination: (param: { limit: number }) => void;
}

type AuthenticationTableProps = OwnProps &
  AuthenticationTableReduxProps &
  AuthenticationTableDispatchProps;

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

const AuthenticationTableComponent = pure<AuthenticationTableProps>(
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
      columns={getAuthenticationColumns(startDate)}
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

const mapStateToProps = (state: State) => authenticationsSelector(state);

export const AuthenticationTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateAuthenticationsLimit,
  }
)(AuthenticationTableComponent);

const getAuthenticationColumns = (startDate: number) => [
  {
    name: 'User',
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => {
      const userName = defaultToEmpty(node.user.name);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: node._id,
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
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.failures)}</>,
  },
  {
    name: 'Successes',
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.successes)}</>,
  },
  {
    name: 'From',
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.source.ip)}</>,
  },
  {
    name: 'To',
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.host.name)}</>,
  },
  {
    name: 'Latest',
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => (
      <>{node.latest ? moment(node.latest).fromNow() : getEmptyValue()}</>
    ),
  },
];
