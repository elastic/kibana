/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getRiskScoreBetterColumns } from './columns';
import type {
  HostsRiskScore,
  RiskScoreBetterItem,
  RiskScoreBetterSortField,
} from '../../../../common/search_strategy';
import { RiskScoreBetterFields, HostRiskSeverity } from '../../../../common/search_strategy';
import { State } from '../../../common/store';
import * as i18n from '../hosts_table/translations';
import { HOSTS_BY_RISK } from './translations';
import { SeverityBar } from './severity_bar';
import { SeverityBadges } from './severity_badges';
import { SeverityFilterGroup } from './severity_filter_group';
import { SeverityCount } from '../../containers/kpi_hosts/risky_hosts';

export const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

const tableType = hostsModel.HostsTableType.riskScoreBetter;

interface RiskScoreBetterTableProps {
  data: HostsRiskScore[];
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  severityCount: SeverityCount;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type RiskScoreBetterColumns = [
  Columns<RiskScoreBetterItem[RiskScoreBetterFields.hostName]>,
  Columns<RiskScoreBetterItem[RiskScoreBetterFields.riskScore]>,
  Columns<RiskScoreBetterItem[RiskScoreBetterFields.risk]>
];

const RiskScoreBetterTableComponent: React.FC<RiskScoreBetterTableProps> = ({
  data,
  id,
  isInspect,
  loading,
  loadPage,
  severityCount,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getRiskScoreBetterSelector = useMemo(() => hostsSelectors.riskScoreBetterSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getRiskScoreBetterSelector(state, hostsModel.HostsType.page)
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

  const onSort = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort = criteria.sort;
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          dispatch(
            hostsActions.updateRiskScoreBetterSort({
              sort: newSort as RiskScoreBetterSortField,
              hostsType: type,
            })
          );
        }
      }
    },
    [dispatch, sort, type]
  );
  const dispatchSeverityUpdate = useCallback(
    (s: HostRiskSeverity) => {
      dispatch(
        hostsActions.updateRiskScoreBetterSeverityFilter({
          severitySelection: [s],
          hostsType: type,
        })
      );
    },
    [dispatch, type]
  );
  const columns = useMemo(
    () => getRiskScoreBetterColumns({ dispatchSeverityUpdate }),
    [dispatchSeverityUpdate]
  );

  const risk = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <SeverityBadges severityCount={severityCount} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SeverityBar severityCount={severityCount} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerFilters={<SeverityFilterGroup severityCount={severityCount} type={type} />}
      headerSupplement={risk}
      headerTitle={HOSTS_BY_RISK}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      isInspect={isInspect}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onSort}
      pageOfItems={data}
      showMorePagesIndicator={false}
      sorting={sort}
      split={true}
      stackHeader={true}
      totalCount={totalCount}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
    />
  );
};

RiskScoreBetterTableComponent.displayName = 'RiskScoreBetterTableComponent';

export const RiskScoreBetterTable = React.memo(RiskScoreBetterTableComponent);

RiskScoreBetterTable.displayName = 'RiskScoreBetterTable';
