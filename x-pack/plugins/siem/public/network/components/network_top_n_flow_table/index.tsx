/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { last } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopNFlowEdges,
  NetworkTopTablesFields,
  NetworkTopTablesSortField,
} from '../../../graphql/types';
import { State } from '../../../common/store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';
import { networkActions, networkModel, networkSelectors } from '../../store';
import { getNFlowColumnsCurated } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopNFlowEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

type NetworkTopNFlowTableProps = OwnProps & PropsFromRedux;

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
  activePage,
  data,
  fakeTotalCount,
  flowTargeted,
  id,
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
        ? networkModel.IpDetailsTableType.topNFlowSource
        : networkModel.IpDetailsTableType.topNFlowDestination;
  }

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection = field !== sort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopNFlowSort: NetworkTopTablesSortField = {
          field: field as NetworkTopTablesFields,
          direction: newSortDirection as Direction,
        };
        if (!deepEqual(newTopNFlowSort, sort)) {
          updateNetworkTable({
            networkType: type,
            tableType,
            updates: {
              sort: newTopNFlowSort,
            },
          });
        }
      }
    },
    [sort, type, tableType, updateNetworkTable]
  );

  const field =
    sort.field === NetworkTopTablesFields.bytes_out ||
    sort.field === NetworkTopTablesFields.bytes_in
      ? `node.network.${sort.field}`
      : `node.${flowTargeted}.${sort.field}`;

  const updateActivePage = useCallback(
    (newPage) =>
      updateNetworkTable({
        networkType: type,
        tableType,
        updates: { activePage: newPage },
      }),
    [updateNetworkTable, type, tableType]
  );

  const updateLimitPagination = useCallback(
    (newLimit) =>
      updateNetworkTable({ networkType: type, tableType, updates: { limit: newLimit } }),
    [updateNetworkTable, type, tableType]
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

const makeMapStateToProps = () => {
  const getTopNFlowSelector = networkSelectors.topNFlowSelector();
  return (state: State, { type, flowTargeted }: OwnProps) =>
    getTopNFlowSelector(state, type, flowTargeted);
};

const mapDispatchToProps = {
  updateNetworkTable: networkActions.updateNetworkTable,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const NetworkTopNFlowTable = connector(React.memo(NetworkTopNFlowTableComponent));
