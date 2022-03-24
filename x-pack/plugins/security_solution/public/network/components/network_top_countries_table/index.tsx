/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import type { DataViewBase } from '@kbn/es-query';

import { networkActions, networkModel, networkSelectors } from '../../store';
import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  NetworkTopTablesFields,
  SortField,
} from '../../../../common/search_strategy';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';

import { getCountriesColumnsCurated } from './columns';
import * as i18n from './translations';

interface NetworkTopCountriesTableProps {
  data: NetworkTopCountriesEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
  id: string;
  indexPattern: DataViewBase;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

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

const NetworkTopCountriesTableComponent: React.FC<NetworkTopCountriesTableProps> = ({
  data,
  fakeTotalCount,
  flowTargeted,
  id,
  indexPattern,
  isInspect,
  loading,
  loadPage,
  showMorePagesIndicator,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getTopCountriesSelector = useMemo(() => networkSelectors.topCountriesSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopCountriesSelector(state, type, flowTargeted)
  );

  const headerTitle: string = useMemo(
    () =>
      flowTargeted === FlowTargetSourceDest.source
        ? i18n.SOURCE_COUNTRIES
        : i18n.DESTINATION_COUNTRIES,
    [flowTargeted]
  );

  const tableType: networkModel.TopCountriesTableType = useMemo(() => {
    if (type === networkModel.NetworkType.page) {
      return flowTargeted === FlowTargetSourceDest.source
        ? networkModel.NetworkTableType.topCountriesSource
        : networkModel.NetworkTableType.topCountriesDestination;
    }

    return flowTargeted === FlowTargetSourceDest.source
      ? networkModel.NetworkDetailsTableType.topCountriesSource
      : networkModel.NetworkDetailsTableType.topCountriesDestination;
  }, [flowTargeted, type]);

  const field =
    sort.field === NetworkTopTablesFields.bytes_out ||
    sort.field === NetworkTopTablesFields.bytes_in
      ? `node.network.${sort.field}`
      : `node.${flowTargeted}.${sort.field}`;

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        })
      ),
    [dispatch, type, tableType]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        })
      ),
    [dispatch, type, tableType]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const lastField = last(splitField) as NetworkTopTablesFields;
        const newSortDirection =
          lastField !== sort.field ? Direction.desc : (criteria.sort.direction as Direction); // sort by desc on init click
        const newTopCountriesSort: SortField<NetworkTopTablesFields> = {
          field: lastField,
          direction: newSortDirection,
        };
        if (!deepEqual(newTopCountriesSort, sort)) {
          dispatch(
            networkActions.updateNetworkTable({
              networkType: type,
              tableType,
              updates: {
                sort: newTopCountriesSort,
              },
            })
          );
        }
      }
    },
    [sort, dispatch, type, tableType]
  );

  const columns = useMemo(
    () => getCountriesColumnsCurated(indexPattern, flowTargeted, type, NetworkTopCountriesTableId),
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
};

NetworkTopCountriesTableComponent.displayName = 'NetworkTopCountriesTableComponent';

export const NetworkTopCountriesTable = React.memo(NetworkTopCountriesTableComponent);
