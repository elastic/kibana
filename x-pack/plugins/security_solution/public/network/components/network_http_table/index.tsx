/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { networkActions, networkModel, networkSelectors } from '../../store';
import { NetworkHttpEdges, NetworkHttpFields } from '../../../../common/search_strategy';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';

import { getNetworkHttpColumns } from './columns';
import * as i18n from './translations';

interface NetworkHttpTableProps {
  data: NetworkHttpEdges[];
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

const NetworkHttpTableComponent: React.FC<NetworkHttpTableProps> = ({
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
  const getNetworkHttpSelector = useMemo(() => networkSelectors.httpSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getNetworkHttpSelector(state, type)
  );
  const tableType =
    type === networkModel.NetworkType.page
      ? networkModel.NetworkTableType.http
      : networkModel.NetworkDetailsTableType.http;

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
      if (criteria.sort != null && criteria.sort.direction !== sort.direction) {
        dispatch(
          networkActions.updateNetworkTable({
            networkType: type,
            tableType,
            updates: {
              sort: {
                direction: criteria.sort.direction,
              },
            },
          })
        );
      }
    },
    [sort.direction, dispatch, type, tableType]
  );

  const sorting = { field: `node.${NetworkHttpFields.requestCount}`, direction: sort.direction };

  const columns = useMemo(() => getNetworkHttpColumns(tableType), [tableType]);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={i18n.HTTP_REQUESTS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      itemsPerRow={rowItems}
      isInspect={isInspect}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onChange}
      pageOfItems={data}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={showMorePagesIndicator}
      sorting={sorting}
      totalCount={fakeTotalCount}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
};

NetworkHttpTableComponent.displayName = 'NetworkHttpTableComponent';

export const NetworkHttpTable = React.memo(NetworkHttpTableComponent);
