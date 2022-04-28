/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getHostRiskScoreColumns } from './columns';
import type {
  HostsRiskScore,
  RiskScoreItem,
  RiskScoreSortField,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../common/search_strategy';
import { State } from '../../../common/store';
import * as i18n from '../hosts_table/translations';
import * as i18nHosts from './translations';

import { SeverityBadges } from '../../../common/components/severity/severity_badges';
import { SeverityBar } from '../../../common/components/severity/severity_bar';
import { SeverityFilterGroup } from '../../../common/components/severity/severity_filter_group';

import { SeverityCount } from '../../../common/components/severity/types';

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

const tableType = hostsModel.HostsTableType.risk;

interface HostRiskScoreTableProps {
  data: HostsRiskScore[];
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
  severityCount: SeverityCount;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type HostRiskScoreColumns = [
  Columns<RiskScoreItem[RiskScoreFields.hostName]>,
  Columns<RiskScoreItem[RiskScoreFields.riskScore]>,
  Columns<RiskScoreItem[RiskScoreFields.risk]>
];

const HostRiskScoreTableComponent: React.FC<HostRiskScoreTableProps> = ({
  data,
  id,
  isInspect,
  loading,
  loadPage,
  setQuerySkip,
  severityCount,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getHostRiskScoreSelector = useMemo(() => hostsSelectors.hostRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getHostRiskScoreSelector(state, hostsModel.HostsType.page)
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
            hostsActions.updateHostRiskScoreSort({
              sort: newSort as RiskScoreSortField,
              hostsType: type,
            })
          );
        }
      }
    },
    [dispatch, sort, type]
  );
  const dispatchSeverityUpdate = useCallback(
    (s: RiskSeverity) => {
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: [s],
          hostsType: type,
        })
      );
    },
    [dispatch, type]
  );
  const columns = useMemo(
    () => getHostRiskScoreColumns({ dispatchSeverityUpdate }),
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

  const headerTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{i18nHosts.HOSTS_BY_RISK}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          color="subdued"
          content={i18nHosts.HOST_RISK_TABLE_TOOLTIP}
          position="right"
          size="l"
          type="iInCircle"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const getHostRiskScoreFilterQuerySelector = useMemo(
    () => hostsSelectors.hostRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    getHostRiskScoreFilterQuerySelector(state, type)
  );

  const onSelect = useCallback(
    (newSelection: RiskSeverity[]) => {
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: newSelection,
          hostsType: type,
        })
      );
    },
    [dispatch, type]
  );

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerFilters={
        <SeverityFilterGroup
          selectedSeverities={severitySelectionRedux}
          severityCount={severityCount}
          title={i18n.HOST_RISK}
          onSelect={onSelect}
        />
      }
      headerSupplement={risk}
      headerTitle={headerTitle}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      isInspect={isInspect}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onSort}
      pageOfItems={data}
      setQuerySkip={setQuerySkip}
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

HostRiskScoreTableComponent.displayName = 'HostRiskScoreTableComponent';

export const HostRiskScoreTable = React.memo(HostRiskScoreTableComponent);

HostRiskScoreTable.displayName = 'HostRiskScoreTable';
