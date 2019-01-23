/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import moment from 'moment';
import { AuthenticationsEdges } from '../../../../graphql/types';
import { authenticationsSelector, hostsActions, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { defaultToEmpty, getEmptyValue } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';

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
      loadingTitle={i18n.AUTHENTICATION_FAILURES}
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
      title={
        <h3>
          {i18n.AUTHENTICATION_FAILURES} <EuiBadge color="hollow">{totalCount}</EuiBadge>
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
    name: i18n.USER,
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
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'auditd.data.acct',
                value: userName!,
              },
              queryDate: {
                from: startDate,
                to: moment().valueOf(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
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
    name: i18n.FAILURES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.failures)}</>,
  },
  {
    name: i18n.SUCCESSES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.successes)}</>,
  },
  {
    name: i18n.FROM,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.source.ip)}</>,
  },
  {
    name: i18n.TO,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => <>{defaultToEmpty(node.host.name)}</>,
  },
  {
    name: i18n.LATEST,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: AuthenticationsEdges) => (
      <>{node.latest ? <FormattedRelative value={new Date(node.latest)} /> : getEmptyValue()}</>
    ),
  },
];
