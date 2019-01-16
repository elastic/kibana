/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { noop } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import {
  HostEcsFields,
  UncommonProcessesEdges,
  UncommonProcessItem,
} from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { hostsActions, State, uncommonProcessesSelector } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { defaultToEmpty, getEmptyValue, getOrEmpty } from '../../../empty_value';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

interface OwnProps {
  data: UncommonProcessesEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
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
    startDate,
  }) => (
    <LoadMoreTable
      columns={getUncommonColumns(startDate)}
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
    updateLimitPagination: hostsActions.updateUncommonProcessesLimit,
  }
)(UncommonProcessTableComponent);

const extractHostNames = (hosts: HostEcsFields[]) => hosts.map(host => host.name).join(', ');

const getUncommonColumns = (startDate: number) => [
  {
    name: 'Name',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => {
      const processName = defaultToEmpty(uncommonProcess.process.name);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: uncommonProcess._id,
              name: processName!,
              negated: false,
              queryMatch: `process.name: "${escapeQueryValue(processName!)}"`,
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
                processName
              )
            }
          />
        </>
      );
    },
  },
  {
    name: 'User',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{getOrEmpty('user.name', uncommonProcess)}</>
    ),
  },
  {
    name: 'Command Line',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultToEmpty(uncommonProcess.process.title)}</>
    ),
  },
  {
    name: 'Number of Instances',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{defaultToEmpty(uncommonProcess.instances)}</>
    ),
  },
  {
    name: 'Number of Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{uncommonProcess.host != null ? uncommonProcess.host.length : getEmptyValue()}</>
    ),
  },
  {
    name: 'Hosts',
    truncateText: false,
    hideForMobile: false,
    render: ({ uncommonProcess }: { uncommonProcess: UncommonProcessItem }) => (
      <>{uncommonProcess.host != null ? extractHostNames(uncommonProcess.host) : getEmptyValue()}</>
    ),
  },
];
