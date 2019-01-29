/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { HostEcsFields, UncommonProcessesEdges } from '../../../../graphql/types';
import { hostsActions, State, uncommonProcessesSelector } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import {
  defaultToEmptyTag,
  getEmptyTagValue,
  getEmptyValue,
  getOrEmptyTag,
} from '../../../empty_value';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';

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
  updateLimitPagination: ActionCreator<{ limit: number }>;
}

type UncommonProcessTableProps = OwnProps &
  UncommonProcessTableReduxProps &
  UncommonProcessTableDispatchProps;

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
      loadingTitle={i18n.UNCOMMON_PROCESSES}
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newLimit => updateLimitPagination({ limit: newLimit })}
      title={
        <h3>
          {i18n.UNCOMMON_PROCESSES} <EuiBadge color="hollow">{totalCount}</EuiBadge>
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

const getUncommonColumns = (startDate: number): Array<Columns<UncommonProcessesEdges>> => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const processName: string | null = get('process.name', node);
      if (processName != null) {
        return (
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: escapeDataProviderId(
                `uncommon-process-table-${node._id}-processName-${processName}`
              ),
              name: processName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'process.name',
                value: processName,
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
                processName
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
    name: i18n.LAST_USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => getOrEmptyTag('user.name', node),
  },
  {
    name: i18n.LAST_COMMAND,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.process.title),
  },
  {
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.instances),
  },
  {
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.host != null ? node.host.length : getEmptyValue()}</>,
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.host != null ? extractHostNames(node.host) : getEmptyValue()}</>,
  },
];
