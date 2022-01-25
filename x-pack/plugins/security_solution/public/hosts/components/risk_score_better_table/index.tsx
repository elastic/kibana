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
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getRiskScoreBetterColumns } from './columns';
import type {
  RiskScoreBetterEdges,
  RiskScoreBetterItem,
  RiskScoreBetterSortField,
} from '../../../../common/search_strategy';
import {
  RiskScoreBetterFields,
  Direction,
  HostRiskSeverity,
} from '../../../../common/search_strategy';
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
  data: RiskScoreBetterEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  severityCount: SeverityCount;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type RiskScoreBetterColumns = [
  Columns<RiskScoreBetterItem['host_name']>,
  Columns<RiskScoreBetterItem['risk_score']>,
  Columns<RiskScoreBetterItem['risk']>
];

const getSorting = (sortField: RiskScoreBetterFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const RiskScoreBetterTableComponent: React.FC<RiskScoreBetterTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  showMorePagesIndicator,
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
        const newSort: RiskScoreBetterSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          dispatch(
            hostsActions.updateRiskScoreBetterSort({
              sort: newSort,
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

  const sorting = useMemo(() => getSorting(sort.field, sort.direction), [sort]);

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
      showMorePagesIndicator={showMorePagesIndicator}
      sorting={sorting}
      split={true}
      stackHeader={true}
      totalCount={fakeTotalCount}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
    />
  );
};

RiskScoreBetterTableComponent.displayName = 'RiskScoreBetterTableComponent';

const getSortField = (field: string): RiskScoreBetterFields => {
  switch (field) {
    case `node.${RiskScoreBetterFields.hostName}`:
      return RiskScoreBetterFields.hostName;
    case `node.${RiskScoreBetterFields.risk}`:
      return RiskScoreBetterFields.risk;
    case `node.${RiskScoreBetterFields.riskScore}`:
      return RiskScoreBetterFields.riskScore;
    default:
      return RiskScoreBetterFields.riskScore;
  }
};

const getNodeField = (field: RiskScoreBetterFields): string => `node.${field}`;

export const RiskScoreBetterTable = React.memo(RiskScoreBetterTableComponent);

RiskScoreBetterTable.displayName = 'RiskScoreBetterTable';
