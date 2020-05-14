/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { IIndexPattern } from 'src/plugins/data/public';

import {
  Direction,
  HostFields,
  HostItem,
  HostsEdges,
  HostsFields,
  HostsSortField,
  OsFields,
} from '../../../graphql/types';
import { assertUnreachable } from '../../../common/lib/helpers';
import { State } from '../../../common/store';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getHostsColumns } from './columns';
import * as i18n from './translations';

const tableType = hostsModel.HostsTableType.hosts;

interface OwnProps {
  data: HostsEdges[];
  fakeTotalCount: number;
  id: string;
  indexPattern: IIndexPattern;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type HostsTableColumns = [
  Columns<HostFields['name']>,
  Columns<HostItem['lastSeen']>,
  Columns<OsFields['name']>,
  Columns<OsFields['version']>
];

type HostsTableProps = OwnProps & PropsFromRedux;

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
const getSorting = (
  trigger: string,
  sortField: HostsFields,
  direction: Direction
): SortingBasicTable => ({ field: getNodeField(sortField), direction });

const HostsTableComponent = React.memo<HostsTableProps>(
  ({
    activePage,
    data,
    direction,
    fakeTotalCount,
    id,
    indexPattern,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    sortField,
    totalCount,
    type,
    updateHostsSort,
    updateTableActivePage,
    updateTableLimit,
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

    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const sort: HostsSortField = {
            field: getSortField(criteria.sort.field),
            direction: criteria.sort.direction as Direction,
          };
          if (sort.direction !== direction || sort.field !== sortField) {
            updateHostsSort({
              sort,
              hostsType: type,
            });
          }
        }
      },
      [direction, sortField, type, updateHostsSort]
    );

    const hostsColumns = useMemo(() => getHostsColumns(), []);

    const sorting = useMemo(() => getSorting(`${sortField}-${direction}`, sortField, direction), [
      sortField,
      direction,
    ]);

    return (
      <PaginatedTable
        activePage={activePage}
        columns={hostsColumns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.HOSTS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        onChange={onChange}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={sorting}
        totalCount={fakeTotalCount}
        updateLimitPagination={updateLimitPagination}
        updateActivePage={updateActivePage}
      />
    );
  }
);

HostsTableComponent.displayName = 'HostsTableComponent';

const getSortField = (field: string): HostsFields => {
  switch (field) {
    case 'node.host.name':
      return HostsFields.hostName;
    case 'node.lastSeen':
      return HostsFields.lastSeen;
    default:
      return HostsFields.lastSeen;
  }
};

const getNodeField = (field: HostsFields): string => {
  switch (field) {
    case HostsFields.hostName:
      return 'node.host.name';
    case HostsFields.lastSeen:
      return 'node.lastSeen';
  }
  assertUnreachable(field);
};

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getHostsSelector(state, type);
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  updateHostsSort: hostsActions.updateHostsSort,
  updateTableActivePage: hostsActions.updateTableActivePage,
  updateTableLimit: hostsActions.updateTableLimit,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const HostsTable = connector(HostsTableComponent);

HostsTable.displayName = 'HostsTable';
