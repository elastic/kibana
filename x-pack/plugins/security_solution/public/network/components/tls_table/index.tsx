/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { networkActions, networkModel, networkSelectors } from '../../store';
import {
  Direction,
  NetworkTlsEdges,
  NetworkTlsFields,
  SortField,
} from '../../../../common/search_strategy';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import {
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { getTlsColumns } from './columns';
import * as i18n from './translations';

interface TlsTableProps {
  data: NetworkTlsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
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

export const tlsTableId = 'tls-table';

const TlsTableComponent: React.FC<TlsTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  setQuerySkip,
  showMorePagesIndicator,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getTlsSelector = useMemo(() => networkSelectors.tlsSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) => getTlsSelector(state, type));
  const tableType: networkModel.TopTlsTableType =
    type === networkModel.NetworkType.page
      ? networkModel.NetworkTableType.tls
      : networkModel.NetworkDetailsTableType.tls;

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
        const newTlsSort: SortField<NetworkTlsFields> = {
          field: getSortFromString(splitField[splitField.length - 1]),
          direction: criteria.sort.direction as Direction,
        };
        if (!deepEqual(newTlsSort, sort)) {
          dispatch(
            networkActions.updateNetworkTable({
              networkType: type,
              tableType,
              updates: { sort: newTlsSort },
            })
          );
        }
      }
    },
    [sort, dispatch, type, tableType]
  );

  const columns = useMemo(() => getTlsColumns(tlsTableId), []);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      showMorePagesIndicator={showMorePagesIndicator}
      headerCount={totalCount}
      headerTitle={i18n.TRANSPORT_LAYER_SECURITY}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      isInspect={isInspect}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onChange}
      pageOfItems={data}
      setQuerySkip={setQuerySkip}
      sorting={getSortField(sort)}
      totalCount={fakeTotalCount}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
};

TlsTableComponent.displayName = 'TlsTableComponent';

export const TlsTable = React.memo(TlsTableComponent);

const getSortField = (sortField: SortField<NetworkTlsFields>): SortingBasicTable => ({
  field: `node.${sortField.field}`,
  direction: sortField.direction,
});

const getSortFromString = (sortField: string): NetworkTlsFields => {
  switch (sortField) {
    case '_id':
      return NetworkTlsFields._id;
    default:
      return NetworkTlsFields._id;
  }
};
