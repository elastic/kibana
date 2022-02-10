/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import {
  HostsUncommonProcessesEdges,
  HostsUncommonProcessItem,
} from '../../../../common/search_strategy';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { defaultToEmptyTag, getEmptyValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../common/components/tables/helpers';
import { HostsType } from '../../store/model';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

const tableType = hostsModel.HostsTableType.uncommonProcesses;
interface UncommonProcessTableProps {
  data: HostsUncommonProcessesEdges[];
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
  Columns<HostsUncommonProcessesEdges>,
  Columns<HostsUncommonProcessesEdges>,
  Columns<HostsUncommonProcessesEdges>,
  Columns<HostsUncommonProcessesEdges>,
  Columns<HostsUncommonProcessesEdges>,
  Columns<HostsUncommonProcessesEdges>
];

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
    data,
    fakeTotalCount,
    id,
    isInspect,
    loading,
    loadPage,
    totalCount,
    showMorePagesIndicator,
    type,
  }) => {
    const dispatch = useDispatch();
    const getUncommonProcessesSelector = useMemo(
      () => hostsSelectors.uncommonProcessesSelector(),
      []
    );
    const { activePage, limit } = useDeepEqualSelector((state) =>
      getUncommonProcessesSelector(state, type)
    );

    const updateLimitPagination = useCallback(
      (newLimit) =>
        dispatch(
          hostsActions.updateTableLimit({
            hostsType: type,
            limit: newLimit,
            tableType,
          })
        ),
      [type, dispatch]
    );

    const updateActivePage = useCallback(
      (newPage) =>
        dispatch(
          hostsActions.updateTableActivePage({
            activePage: newPage,
            hostsType: type,
            tableType,
          })
        ),
      [type, dispatch]
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

export const UncommonProcessTable = React.memo(UncommonProcessTableComponent);

UncommonProcessTable.displayName = 'UncommonProcessTable';

const getUncommonColumns = (): UncommonProcessTableColumns => [
  {
    name: i18n.NAME,
    truncateText: false,
    mobileOptions: { show: true },
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
    mobileOptions: { show: true },
    render: ({ node }) => <>{node.hosts != null ? node.hosts.length : getEmptyValue()}</>,
    width: '8%',
  },
  {
    align: 'right',
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    mobileOptions: { show: true },
    render: ({ node }) => defaultToEmptyTag(node.instances),
    width: '8%',
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    mobileOptions: { show: true },
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getHostNames(node),
        attrName: 'host.name',
        idPrefix: `uncommon-process-table-${node._id}-processHost`,
        render: (item) => <HostDetailsLink hostName={item} />,
      }),
    width: '25%',
  },
  {
    name: i18n.LAST_COMMAND,
    truncateText: false,
    mobileOptions: { show: true },
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
    mobileOptions: { show: true },
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: node.user != null ? node.user.name : null,
        attrName: 'user.name',
        idPrefix: `uncommon-process-table-${node._id}-processUser`,
      }),
  },
];

export const getHostNames = (node: HostsUncommonProcessItem): string[] => {
  if (node.hosts != null) {
    return node.hosts
      .filter((host) => host.name != null && host.name[0] != null)
      .map((host) => (host.name != null && host.name[0] != null ? host.name[0] : ''));
  } else {
    return [];
  }
};

export const getUncommonColumnsCurated = (pageType: HostsType): UncommonProcessTableColumns => {
  const columns: UncommonProcessTableColumns = getUncommonColumns();
  if (pageType === HostsType.details) {
    return [i18n.HOSTS, i18n.NUMBER_OF_HOSTS].reduce((acc, name) => {
      acc.splice(
        acc.findIndex((column) => column.name === name),
        1
      );
      return acc;
    }, columns);
  } else {
    return columns;
  }
};
