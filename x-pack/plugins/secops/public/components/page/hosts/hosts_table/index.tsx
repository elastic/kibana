/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo, noop } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { pure } from 'recompose';

import { HostItem, HostsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { hostsActions, hostsLimitSelector, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

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

const mapStateToProps = (state: State) => hostsLimitSelector(state);

export const HostsTable = connect(
  mapStateToProps,
  {
    updateLimitPagination: hostsActions.updateHostsLimit,
  }
)(HostsTableComponent);

const getHostsColumns = () => [
  {
    name: 'Name',
    truncateText: false,
    hideForMobile: false,
    render: ({ host }: { host: HostItem }) => {
      const hostName = defaultTo('--', host.name);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: host._id!,
              name: hostName,
              negated: false,
              queryMatch: `host.id: "${escapeQueryValue(host.hostId!)}"`,
              queryDate: `@timestamp >= ${moment(
                host.firstSeen!
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
              ) : (
                <Link to={`hosts/${host.hostId}`}>{hostName}</Link> // TODO: Does this need escapeQueryValue() or encodeURIComponent()?
              )
            }
          />
        </>
      );
    },
  },
  {
    name: 'First seen',
    truncateText: false,
    hideForMobile: false,
    render: ({ host }: { host: HostItem }) => <>{defaultTo('--', host.firstSeen)}</>,
  },
  {
    name: 'OS',
    truncateText: false,
    hideForMobile: false,
    render: ({ host }: { host: HostItem }) => <>{defaultTo('--', host.os)}</>,
  },
  {
    name: 'Version',
    truncateText: false,
    hideForMobile: false,
    render: ({ host }: { host: HostItem }) => <>{defaultTo('--', host.version)}</>,
  },
];
