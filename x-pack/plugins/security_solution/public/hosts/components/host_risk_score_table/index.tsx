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
  HostRiskScoreItem,
  HostRiskScoreSortField,
} from '../../../../common/search_strategy';
import { HostRiskScoreFields, HostRiskSeverity } from '../../../../common/search_strategy';
import { State } from '../../../common/store';
import * as i18n from '../hosts_table/translations';
import * as i18nHosts from './translations';
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

const tableType = hostsModel.HostsTableType.risk;

interface HostRiskScoreTableProps {
  data: HostsRiskScore[];
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  severityCount: SeverityCount;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type HostRiskScoreColumns = [
  Columns<HostRiskScoreItem[HostRiskScoreFields.hostName]>,
  Columns<HostRiskScoreItem[HostRiskScoreFields.riskScore]>,
  Columns<HostRiskScoreItem[HostRiskScoreFields.risk]>
];

const HostRiskScoreTableComponent: React.FC<HostRiskScoreTableProps> = ({
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
              sort: newSort as HostRiskScoreSortField,
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
  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerFilters={<SeverityFilterGroup severityCount={severityCount} type={type} />}
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
