/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions } from '../../../../store/actions';
import { UncommonProcessesEdges, UncommonProcessItem } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { defaultToEmptyTag, getEmptyValue } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../tables/helpers';

interface OwnProps {
  data: UncommonProcessesEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  type: hostsModel.HostsType;
}

interface UncommonProcessTableReduxProps {
  limit: number;
}

interface UncommonProcessTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
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

export const getArgs = (args: string[] | null | undefined): string | null => {
  if (args != null && args.length !== 0) {
    return args.join(' ');
  } else {
    return null;
  }
};

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
    type,
  }) => (
    <LoadMoreTable
      columns={getUncommonColumns()}
      hasNextPage={hasNextPage}
      headerCount={totalCount}
      headerTitle={i18n.UNCOMMON_PROCESSES}
      headerUnit={i18n.UNIT(totalCount)}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadingTitle={i18n.UNCOMMON_PROCESSES}
      loadMore={() => loadMore(nextCursor)}
      pageOfItems={data}
      updateLimitPagination={newLimit =>
        updateLimitPagination({ limit: newLimit, hostsType: type })
      }
    />
  )
);

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  return (state: State, { type }: OwnProps) => getUncommonProcessesSelector(state, type);
};

export const UncommonProcessTable = connect(
  makeMapStateToProps,
  {
    updateLimitPagination: hostsActions.updateUncommonProcessesLimit,
  }
)(UncommonProcessTableComponent);

const getUncommonColumns = (): [
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>
] => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.process.name,
        attrName: 'process.name',
        idPrefix: `uncommon-process-table-${node._id}-processName`,
      }),
  },
  {
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.hosts != null ? node.hosts.length : getEmptyValue()}</>,
  },
  {
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.instances),
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getHostNames(node),
        attrName: 'host.name',
        idPrefix: `uncommon-process-table-${node._id}-processHost`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.LAST_COMMAND,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.process != null ? node.process.args : null,
        attrName: 'process.args',
        idPrefix: `uncommon-process-table-${node._id}-processArgs`,
        displayCount: 1, // TODO: Change this back once we have improved the UI
      }),
  },
  {
    name: i18n.LAST_USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.user != null ? node.user.name : null,
        attrName: 'user.name',
        idPrefix: `uncommon-process-table-${node._id}-processUser`,
      }),
  },
];

export const getHostNames = (node: UncommonProcessItem): string[] => {
  if (node.hosts != null) {
    return node.hosts
      .filter(host => host.name != null && host.name[0] != null)
      .map(host => (host.name != null && host.name[0] != null ? host.name[0] : ''));
  } else {
    return [];
  }
};
