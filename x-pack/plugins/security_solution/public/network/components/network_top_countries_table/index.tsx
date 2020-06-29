/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { IIndexPattern } from 'src/plugins/data/public';

import { networkActions, networkModel, networkSelectors } from '../../store';
import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  NetworkTopTablesFields,
  NetworkTopTablesSortField,
} from '../../../graphql/types';
import { State } from '../../../common/store';

import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';

import { getCountriesColumnsCurated } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopCountriesEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
  id: string;
  indexPattern: IIndexPattern;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

type NetworkTopCountriesTableProps = OwnProps & PropsFromRedux;

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

export const NetworkTopCountriesTableId = 'networkTopCountries-top-talkers';

const NetworkTopCountriesTableComponent = React.memo<NetworkTopCountriesTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    flowTargeted,
    id,
    indexPattern,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    sort,
    totalCount,
    type,
    updateNetworkTable,
  }) => {
    let tableType: networkModel.TopCountriesTableType;
    const headerTitle: string =
      flowTargeted === FlowTargetSourceDest.source
        ? i18n.SOURCE_COUNTRIES
        : i18n.DESTINATION_COUNTRIES;

    if (type === networkModel.NetworkType.page) {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.NetworkTableType.topCountriesSource
          : networkModel.NetworkTableType.topCountriesDestination;
    } else {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.IpDetailsTableType.topCountriesSource
          : networkModel.IpDetailsTableType.topCountriesDestination;
    }

    const field =
      sort.field === NetworkTopTablesFields.bytes_out ||
      sort.field === NetworkTopTablesFields.bytes_in
        ? `node.network.${sort.field}`
        : `node.${flowTargeted}.${sort.field}`;

    const updateLimitPagination = useCallback(
      (newLimit) =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        }),
      [type, updateNetworkTable, tableType]
    );

    const updateActivePage = useCallback(
      (newPage) =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        }),
      [type, updateNetworkTable, tableType]
    );

    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const splitField = criteria.sort.field.split('.');
          const lastField = last(splitField);
          const newSortDirection =
            lastField !== sort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
          const newTopCountriesSort: NetworkTopTablesSortField = {
            field: lastField as NetworkTopTablesFields,
            direction: newSortDirection as Direction,
          };
          if (!deepEqual(newTopCountriesSort, sort)) {
            updateNetworkTable({
              networkType: type,
              tableType,
              updates: {
                sort: newTopCountriesSort,
              },
            });
          }
        }
      },
      [type, sort, tableType, updateNetworkTable]
    );

    const columns = useMemo(
      () =>
        getCountriesColumnsCurated(indexPattern, flowTargeted, type, NetworkTopCountriesTableId),
      [indexPattern, flowTargeted, type]
    );

    return (
      <PaginatedTable
        activePage={activePage}
        columns={columns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={headerTitle}
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
        sorting={{ field, direction: sort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={updateActivePage}
        updateLimitPagination={updateLimitPagination}
      />
    );
  }
);

NetworkTopCountriesTableComponent.displayName = 'NetworkTopCountriesTableComponent';

const makeMapStateToProps = () => {
  const getTopCountriesSelector = networkSelectors.topCountriesSelector();
  return (state: State, { type, flowTargeted }: OwnProps) =>
    getTopCountriesSelector(state, type, flowTargeted);
};

const mapDispatchToProps = {
  updateNetworkTable: networkActions.updateNetworkTable,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const NetworkTopCountriesTable = connector(NetworkTopCountriesTableComponent);
