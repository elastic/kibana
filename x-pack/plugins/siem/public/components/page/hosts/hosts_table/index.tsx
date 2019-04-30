/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import {
  Direction,
  HostsEdges,
  HostsFields,
  HostsSortField,
  HostItem,
} from '../../../../graphql/types';
import { assertUnreachable, ValueOf } from '../../../../lib/helpers';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import {
  Criteria,
  ItemsPerRow,
  LoadMoreTable,
  Columns,
  SortingBasicTable,
} from '../../../load_more_table';

import { getHostsColumns } from './columns';
import * as i18n from './translations';
import { TableTitle } from '../../table_title';

const tableType = hostsModel.HostsTableType.hosts;

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
  indexPattern: StaticIndexPattern;
  totalCount: number;
  loadMore: (newActivePage: number, tiebreaker?: string) => void;
  type: hostsModel.HostsType;
}

interface HostsTableReduxProps {
  limit: number;
  sortField: HostsFields;
  direction: Direction;
}

interface HostsTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
  updateTableLimit: ActionCreator<{
    limit: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
  updateHostsSort: ActionCreator<{
    sort: HostsSortField;
    hostsType: hostsModel.HostsType;
  }>;
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

class HostsTableComponent extends React.PureComponent<HostsTableProps> {
  private memoizedColumns: (
    type: hostsModel.HostsType,
    indexPattern: StaticIndexPattern
  ) => Array<Columns<ValueOf<HostItem>>>;
  private memoizedTitle: (totalCount: number) => JSX.Element;
  private memoizedSorting: (
    trigger: string,
    sortField: HostsFields,
    direction: Direction
  ) => SortingBasicTable;

  constructor(props: HostsTableProps) {
    super(props);
    this.memoizedColumns = memoizeOne(this.getMemoizeHostsColumns);
    this.memoizedTitle = memoizeOne(this.getTitle);
    this.memoizedSorting = memoizeOne(this.getSorting);
  }

  public render() {
    const {
      data,
      direction,
      indexPattern,
      limit,
      loading,
      loadMore,
      totalCount,
      sortField,
      type,
      updateTableActivePage,
      updateTableLimit,
    } = this.props;
    return (
      <LoadMoreTable
        columns={this.memoizedColumns(type, indexPattern)}
        loadingTitle={i18n.HOSTS}
        loading={loading}
        pageOfItems={data}
        loadMore={newActivePage => loadMore(newActivePage)}
        limit={limit}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        updateLimitPagination={newLimit =>
          updateTableLimit({
            hostsType: type,
            limit: newLimit,
            tableType,
          })
        }
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            hostsType: type,
            tableType,
          })
        }
        sorting={this.memoizedSorting(`${sortField}-${direction}`, sortField, direction)}
        title={this.memoizedTitle(totalCount)}
        totalCount={totalCount}
      />
    );
  }

  private getSorting = (
    trigger: string,
    sortField: HostsFields,
    direction: Direction
  ): SortingBasicTable => ({ field: getNodeField(sortField), direction });

  private getTitle = (totalCount: number): JSX.Element => (
    <TableTitle title={i18n.HOSTS} infoTooltip={i18n.TOOLTIP} totalCount={totalCount} />
  );

  private getMemoizeHostsColumns = (
    type: hostsModel.HostsType,
    indexPattern: StaticIndexPattern
  ): Array<Columns<ValueOf<HostItem>>> => getHostsColumns(type, indexPattern);

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const sort: HostsSortField = {
        field: getSortField(criteria.sort.field),
        direction: criteria.sort.direction,
      };
      if (sort.direction !== this.props.direction || sort.field !== this.props.sortField) {
        this.props.updateHostsSort({
          sort,
          hostsType: this.props.type,
        });
      }
    }
  };
}

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

export const HostsTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: hostsActions.updateTableActivePage,
    updateTableLimit: hostsActions.updateTableLimit,
    updateHostsSort: hostsActions.updateHostsSort,
  }
)(HostsTableComponent);
