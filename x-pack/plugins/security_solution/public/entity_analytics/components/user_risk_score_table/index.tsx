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

import { getUserRiskScoreColumns } from './columns';

import * as i18nUsers from '../../../explore/users/pages/translations';
import * as i18n from './translations';
import { usersModel, usersSelectors, usersActions } from '../../../explore/users/store';
import type { UserRiskScoreItem } from '../../../../common/search_strategy/security_solution/users/common';
import type { SeverityCount } from '../severity/types';
import { SeverityBadges } from '../severity/severity_badges';
import { SeverityBar } from '../severity/severity_bar';
import { SeverityFilterGroup } from '../severity/severity_filter_group';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { State } from '../../../common/store';
import type {
  RiskScoreFields,
  RiskScoreSortField,
  RiskSeverity,
  UserRiskScore,
} from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/search_strategy';
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

const tableType = usersModel.UsersTableType.risk;

interface UserRiskScoreTableProps {
  data: UserRiskScore[];
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
  severityCount: SeverityCount;
  totalCount: number;
  type: usersModel.UsersType;
}

export type UserRiskScoreColumns = [
  Columns<UserRiskScoreItem[RiskScoreFields.userName]>,
  Columns<UserRiskScoreItem[RiskScoreFields.timestamp]>,
  Columns<UserRiskScoreItem[RiskScoreFields.userRiskScore]>,
  Columns<UserRiskScoreItem[RiskScoreFields.userRisk]>
];

const UserRiskScoreTableComponent: React.FC<UserRiskScoreTableProps> = ({
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

  const getUserRiskScoreSelector = useMemo(() => usersSelectors.userRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUserRiskScoreSelector(state)
  );
  const updateLimitPagination = useCallback<SiemTables['updateLimitPagination']>(
    (newLimit) => {
      dispatch(
        usersActions.updateTableLimit({
          usersType: type,
          limit: newLimit,
          tableType,
        })
      );
    },
    [type, dispatch]
  );

  const updateActivePage = useCallback<SiemTables['updateActivePage']>(
    (newPage) => {
      dispatch(
        usersActions.updateTableActivePage({
          activePage: newPage,
          usersType: type,
          tableType,
        })
      );
    },
    [type, dispatch]
  );

  const onSort = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort = criteria.sort;
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          dispatch(
            usersActions.updateTableSorting({
              sort: newSort as RiskScoreSortField,
              tableType,
            })
          );
        }
      }
    },
    [dispatch, sort]
  );
  const dispatchSeverityUpdate = useCallback(
    (s: RiskSeverity) => {
      dispatch(
        usersActions.updateUserRiskScoreSeverityFilter({
          severitySelection: [s],
        })
      );
    },
    [dispatch]
  );
  const columns = useMemo(
    () => getUserRiskScoreColumns({ dispatchSeverityUpdate }),
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

  const getUserRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.userRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    getUserRiskScoreFilterQuerySelector(state)
  );

  const onSelect = useCallback(
    (newSelection: RiskSeverity[]) => {
      dispatch(
        usersActions.updateUserRiskScoreSeverityFilter({
          severitySelection: newSelection,
        })
      );
    },
    [dispatch]
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
            <RiskInformationButtonEmpty riskEntity={RiskScoreEntity.user} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SeverityFilterGroup
              selectedSeverities={severitySelectionRedux}
              severityCount={severityCount}
              onSelect={onSelect}
              riskEntity={RiskScoreEntity.user}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      headerSupplement={risk}
      headerTitle={i18nUsers.NAVIGATION_RISK_TITLE}
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

UserRiskScoreTableComponent.displayName = 'UserRiskScoreTableComponent';

export const UserRiskScoreTable = React.memo(UserRiskScoreTableComponent);

UserRiskScoreTable.displayName = 'UserRiskScoreTable';
