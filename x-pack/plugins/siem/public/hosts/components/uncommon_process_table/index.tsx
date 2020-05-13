/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { UncommonProcessesEdges, UncommonProcessItem } from '../../../graphql/types';
import { State } from '../../../common/store';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { defaultToEmptyTag, getEmptyValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../common/components/tables/helpers';
import { HostsType } from '../../store/model';
const tableType = hostsModel.HostsTableType.uncommonProcesses;
interface OwnProps {
  data: UncommonProcessesEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type UncommonProcessTableColumns = [
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>,
  Columns<UncommonProcessesEdges>
];

type UncommonProcessTableProps = OwnProps & PropsFromRedux;

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

export const getArgs = (args: string[] | null | undefined): string | null => {
  if (args != null && args.length !== 0) {
    return args.join(' ');
  } else {
    return null;
  }
};

const UncommonProcessTableComponent = React.memo<UncommonProcessTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    id,
    isInspect,
    limit,
    loading,
    loadPage,
    totalCount,
    showMorePagesIndicator,
    updateTableActivePage,
    updateTableLimit,
    type,
  }) => {
    const updateLimitPagination = useCallback(
      newLimit =>
        updateTableLimit({
          hostsType: type,
          limit: newLimit,
          tableType,
        }),
      [type, updateTableLimit]
    );

    const updateActivePage = useCallback(
      newPage =>
        updateTableActivePage({
          activePage: newPage,
          hostsType: type,
          tableType,
        }),
      [type, updateTableActivePage]
    );

    const columns = useMemo(() => getUncommonColumnsCurated(type), [type]);

    return (
      <PaginatedTable
        activePage={activePage}
        columns={columns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.UNCOMMON_PROCESSES}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        totalCount={fakeTotalCount}
        updateLimitPagination={updateLimitPagination}
        updateActivePage={updateActivePage}
      />
    );
  }
);

UncommonProcessTableComponent.displayName = 'UncommonProcessTableComponent';

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  return (state: State, { type }: OwnProps) => getUncommonProcessesSelector(state, type);
};

const mapDispatchToProps = {
  updateTableActivePage: hostsActions.updateTableActivePage,
  updateTableLimit: hostsActions.updateTableLimit,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const UncommonProcessTable = connector(UncommonProcessTableComponent);

UncommonProcessTable.displayName = 'UncommonProcessTable';

const getUncommonColumns = (): UncommonProcessTableColumns => [
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
    width: '20%',
  },
  {
    align: 'right',
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.hosts != null ? node.hosts.length : getEmptyValue()}</>,
    width: '8%',
  },
  {
    align: 'right',
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.instances),
    width: '8%',
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
    width: '25%',
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
    width: '25%',
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

export const getUncommonColumnsCurated = (pageType: HostsType): UncommonProcessTableColumns => {
  const columns: UncommonProcessTableColumns = getUncommonColumns();
  if (pageType === HostsType.details) {
    return [i18n.HOSTS, i18n.NUMBER_OF_HOSTS].reduce((acc, name) => {
      acc.splice(
        acc.findIndex(column => column.name === name),
        1
      );
      return acc;
    }, columns);
  } else {
    return columns;
  }
};
