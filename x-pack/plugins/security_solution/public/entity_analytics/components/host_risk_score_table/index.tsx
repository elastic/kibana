/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  Columns,
  Criteria,
  ItemsPerRow,
  SiemTables,
} from '../../../explore/components/paginated_table';
import { PaginatedTable } from '../../../explore/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../../explore/hosts/store';
import { getHostRiskScoreColumns } from './columns';
import type {
  HostRiskScore,
  RiskScoreItem,
  RiskScoreSortField,
  RiskSeverity,
  RiskScoreFields,
} from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import type { State } from '../../../common/store';
import * as i18n from '../../../explore/hosts/components/hosts_table/translations';
import * as i18nHosts from './translations';

import { SeverityBadges } from '../severity/severity_badges';
import { SeverityBar } from '../severity/severity_bar';
import { SeverityFilterGroup } from '../severity/severity_filter_group';

import type { SeverityCount } from '../severity/types';
import { RiskInformationButtonEmpty } from '../risk_information';

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
  data: HostRiskScore[];
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
  Columns<RiskScoreItem[RiskScoreFields.timestamp]>,
  Columns<RiskScoreItem[RiskScoreFields.hostRiskScore]>,
  Columns<RiskScoreItem[RiskScoreFields.hostRisk]>
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
  const updateLimitPagination = useCallback<SiemTables['updateLimitPagination']>(
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

  const updateActivePage = useCallback<SiemTables['updateActivePage']>(
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
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <RiskInformationButtonEmpty riskEntity={RiskScoreEntity.host} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SeverityFilterGroup
              selectedItems={severitySelectionRedux}
              onSelect={onSelect}
              riskEntity={RiskScoreEntity.host}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      headerSupplement={risk}
      headerTitle={i18nHosts.HOST_RISK_TITLE}
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
