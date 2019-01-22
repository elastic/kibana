/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiLink } from '@elastic/eui';
import { get, isNil, noop } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import { HostsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { hostsActions, hostsSelector, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { defaultToEmpty, getOrEmpty } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';
interface OwnProps {
  data: HostsEdges[];
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
    text: i18n.ROWS_2,
    numberOfRow: 2,
  },
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
      loadingTitle={i18n.HOSTS}
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
          {i18n.HOSTS} <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const mapStateToProps = (state: State) => hostsSelector(state);

export const HostsTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateHostsLimit,
  }
)(HostsTableComponent);

const getHostsColumns = () => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: HostsEdges) => {
      const hostName = getOrEmpty('host.name', node);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: node._id!,
              name: hostName,
              negated: false,
              queryMatch: `host.id: "${escapeQueryValue(node.host!.id!)}"`,
              queryDate: `@timestamp >= ${moment(
                node.firstSeen!
              ).valueOf()} and @timestamp <= ${moment().valueOf()}`,
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
              ) : isNil(get('host.id', node)) ? (
                <>{hostName}</>
              ) : (
                <EuiLink href={`#/link-to/hosts/${encodeURIComponent(node.host!.id!)}`}>
                  {hostName}
                </EuiLink>
              )
            }
          />
        </>
      );
    },
  },
  {
    name: i18n.FIRST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: HostsEdges) => <>{defaultToEmpty(node.firstSeen)}</>,
  },
  {
    name: i18n.OS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: HostsEdges) => <>{getOrEmpty('host.os.name', node)}</>,
  },
  {
    name: i18n.VERSION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: HostsEdges) => <>{getOrEmpty('host.os.version', node)}</>,
  },
];
