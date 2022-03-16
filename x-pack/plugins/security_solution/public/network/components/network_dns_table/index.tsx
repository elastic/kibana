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
  SortField,
  NetworkDnsEdges,
  NetworkDnsFields,
} from '../../../../common/search_strategy';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

import { getNetworkDnsColumns } from './columns';
import { IsPtrIncluded } from './is_ptr_included';
import * as i18n from './translations';

const tableType = networkModel.NetworkTableType.dns;

interface NetworkDnsTableProps {
  data: NetworkDnsEdges[];
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

const NetworkDnsTableComponent: React.FC<NetworkDnsTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  showMorePagesIndicator,
  setQuerySkip,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getNetworkDnsSelector = useMemo(() => networkSelectors.dnsSelector(), []);
  const { activePage, isPtrIncluded, limit, sort } = useDeepEqualSelector(getNetworkDnsSelector);

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        })
      ),
    [type, dispatch]
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
    [dispatch, type]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newDnsSortField: SortField<NetworkDnsFields> = {
          field: criteria.sort.field.split('.')[1] as NetworkDnsFields,
          direction: criteria.sort.direction as Direction,
        };
        if (!deepEqual(newDnsSortField, sort)) {
          dispatch(
            networkActions.updateNetworkTable({
              networkType: type,
              tableType,
              updates: { sort: newDnsSortField },
            })
          );
        }
      }
    },
    [sort, type, dispatch]
  );

  const onChangePtrIncluded = useCallback(
    () =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { isPtrIncluded: !isPtrIncluded },
        })
      ),
    [dispatch, type, isPtrIncluded]
  );

  const columns = useMemo(() => getNetworkDnsColumns(), []);

  const sorting = useMemo(
    () => ({
      field: `node.${sort.field}`,
      direction: sort.direction,
    }),
    [sort.direction, sort.field]
  );

  const HeaderSupplement = useMemo(
    () => <IsPtrIncluded isPtrIncluded={isPtrIncluded} onChange={onChangePtrIncluded} />,
    [isPtrIncluded, onChangePtrIncluded]
  );

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerSupplement={HeaderSupplement}
      headerTitle={i18n.TOP_DNS_DOMAINS}
      headerTooltip={i18n.TOOLTIP}
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

NetworkDnsTableComponent.displayName = 'NetworkDnsTableComponent';

export const NetworkDnsTable = React.memo(NetworkDnsTableComponent);
