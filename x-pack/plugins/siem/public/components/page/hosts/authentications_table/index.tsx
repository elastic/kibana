/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiPanel, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import { get, has } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { AuthenticationsEdges } from '../../../../graphql/types';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
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
  type: hostsModel.HostsType;
}

interface AuthenticationTableReduxProps {
  limit: number;
}

interface AuthenticationTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
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
    type,
  }) => (
    <EuiPanel>
      <LoadMoreTable
        columns={getAuthenticationColumns(startDate)}
        loadingTitle={i18n.AUTHENTICATIONS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        updateLimitPagination={newLimit =>
          updateLimitPagination({ limit: newLimit, hostsType: type })
        }
        title={
          <h3>
            {i18n.AUTHENTICATIONS} <EuiBadge color="hollow">{totalCount}</EuiBadge>
          </h3>
        }
      />
    </EuiPanel>
  )
);

const makeMapStateToProps = () => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getAuthenticationsSelector(state, type);
  };
  return mapStateToProps;
};

export const AuthenticationTable = connect(
  makeMapStateToProps,
  {
    updateLimitPagination: hostsActions.updateAuthenticationsLimit,
  }
)(AuthenticationTableComponent);

const getAuthenticationColumns = (startDate: number): Array<Columns<AuthenticationsEdges>> => [
  {
    name: i18n.USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const userName: string | null = get('user.name', node);
      if (userName != null) {
        const id = escapeDataProviderId(`authentications-table-${node._id}-user-${userName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: userName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: userName,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
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
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.FAILURES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.failures),
  },
  {
    name: i18n.LAST_FAILED_TIME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('lastFailure.timestamp', node) && node.lastFailure!.timestamp != null ? (
        <EuiToolTip position="bottom" content={node.lastFailure!.timestamp!}>
          <FormattedRelative value={new Date(node.lastFailure!.timestamp!)} />
        </EuiToolTip>
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    name: i18n.LAST_FAILED_SOURCE,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const sourceIp: string | null = get('lastFailure.source.ip', node);
      if (sourceIp != null) {
        const id = escapeDataProviderId(
          `authentications-table-${node._id}-lastFailure-${sourceIp}`
        );
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: sourceIp,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'source.ip',
                value: sourceIp,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <IPDetailsLink ip={sourceIp} />
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
    name: i18n.LAST_FAILED_DESTINATION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null = get('lastFailure.host.name', node);
      const hostId: string | null = get('lastFailure.host.id', node);
      if (hostName != null && hostId != null) {
        const id = escapeDataProviderId(`authentications-table-${node._id}-lastFailure-${hostId}`);
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
                displayField: 'host.name',
                displayValue: hostName,
                field: 'host.id',
                value: hostId,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <HostDetailsLink hostId={hostId}>{hostName}</HostDetailsLink>
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
    name: i18n.SUCCESSES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.successes),
  },
  {
    name: i18n.LAST_SUCCESSFUL_TIME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('lastSuccess.timestamp', node) ? (
        <EuiToolTip position="bottom" content={node.lastSuccess!.timestamp!}>
          <FormattedRelative value={new Date(node.lastSuccess!.timestamp!)} />
        </EuiToolTip>
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    name: i18n.LAST_SUCCESSFUL_SOURCE,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const sourceIp: string | null = get('lastSuccess.source.ip', node);
      if (sourceIp != null) {
        const id = escapeDataProviderId(
          `authentications-table-${node._id}-lastSuccess-${sourceIp}`
        );
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: sourceIp,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'source.ip',
                value: sourceIp,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <IPDetailsLink ip={sourceIp} />
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
    name: i18n.LAST_SUCCESSFUL_DESTINATION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null = get('lastSuccess.host.name', node);
      const hostId: string | null = get('lastSuccess.host.id', node);
      if (hostName != null && hostId != null) {
        const id = escapeDataProviderId(`authentications-table-${node._id}-lastSuccess-${hostId}`);
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
                displayField: 'host.name',
                displayValue: hostName,
                field: 'host.id',
                value: hostId,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <HostDetailsLink hostId={hostId}>{hostName}</HostDetailsLink>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
