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

import {
  Direction,
  SortField,
  FlowTargetSourceDest,
  NetworkTopNFlowEdges,
  NetworkTopTablesFields,
} from '../../../../common/search_strategy';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';
import { networkActions, networkModel, networkSelectors } from '../../store';
import { getNFlowColumnsCurated } from './columns';
import * as i18n from './translations';

interface NetworkTopNFlowTableProps {
  data: NetworkTopNFlowEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
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

export const NetworkTopNFlowTableId = 'networkTopSourceFlow-top-talkers';

const NetworkTopNFlowTableComponent: React.FC<NetworkTopNFlowTableProps> = ({
  data,
  fakeTotalCount,
  flowTargeted,
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
  const getTopNFlowSelector = useMemo(() => networkSelectors.topNFlowSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopNFlowSelector(state, type, flowTargeted)
  );

  const columns = useMemo(
    () => getNFlowColumnsCurated(flowTargeted, type, NetworkTopNFlowTableId),
    [flowTargeted, type]
  );

  let tableType: networkModel.TopNTableType;
  const headerTitle: string =
    flowTargeted === FlowTargetSourceDest.source ? i18n.SOURCE_IP : i18n.DESTINATION_IP;

  if (type === networkModel.NetworkType.page) {
    tableType =
      flowTargeted === FlowTargetSourceDest.source
        ? networkModel.NetworkTableType.topNFlowSource
        : networkModel.NetworkTableType.topNFlowDestination;
  } else {
    tableType =
      flowTargeted === FlowTargetSourceDest.source
        ? networkModel.NetworkDetailsTableType.topNFlowSource
        : networkModel.NetworkDetailsTableType.topNFlowDestination;
  }

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection = field !== sort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopNFlowSort: SortField<NetworkTopTablesFields> = {
          field: field as NetworkTopTablesFields,
          direction: newSortDirection,
        };
        if (!deepEqual(newTopNFlowSort, sort)) {
          dispatch(
            networkActions.updateNetworkTable({
              networkType: type,
              tableType,
              updates: {
                sort: newTopNFlowSort,
              },
            })
          );
        }
      }
    },
    [sort, dispatch, type, tableType]
  );

  const sorting = useMemo(
    () => ({
      field:
        sort.field === NetworkTopTablesFields.bytes_out ||
        sort.field === NetworkTopTablesFields.bytes_in
          ? `node.network.${sort.field}`
          : `node.${flowTargeted}.${sort.field}`,
      direction: sort.direction,
    }),
    [flowTargeted, sort]
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
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={showMorePagesIndicator}
      sorting={sorting}
      totalCount={fakeTotalCount}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
};

export const NetworkTopNFlowTable = React.memo(NetworkTopNFlowTableComponent);
