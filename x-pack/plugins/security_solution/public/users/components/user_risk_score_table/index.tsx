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

import { getUserRiskScoreColumns } from './columns';

import * as i18nUsers from '../../pages/translations';
import * as i18n from './translations';
import { usersModel, usersSelectors } from '../../store';
import {
  UserRiskScoreFields,
  UserRiskScoreItem,
} from '../../../../common/search_strategy/security_solution/users/common';
import { SeverityCount } from '../../../common/components/severity/types';
import { SeverityBadges } from '../../../common/components/severity/severity_badges';
import { SeverityBar } from '../../../common/components/severity/severity_bar';
import { SeverityFilterGroup } from '../../../common/components/severity/severity_filter_group';
import { usersActions } from '../../../users/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { State } from '../../../common/store';
import {
  RiskScoreSortField,
  RiskSeverity,
  UsersRiskScore,
} from '../../../../common/search_strategy';

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
  data: UsersRiskScore[];
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
  Columns<UserRiskScoreItem[UserRiskScoreFields.userName]>,
  Columns<UserRiskScoreItem[UserRiskScoreFields.riskScore]>,
  Columns<UserRiskScoreItem[UserRiskScoreFields.risk]>
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
  const updateLimitPagination = useCallback(
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

  const updateActivePage = useCallback(
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

  const headerTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{i18nUsers.NAVIGATION_RISK_TITLE}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          color="subdued"
          content={i18n.USER_RISK_TABLE_TOOLTIP}
          position="right"
          size="l"
          type="iInCircle"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const getUserRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.usersRiskScoreSeverityFilterSelector(),
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
        <SeverityFilterGroup
          selectedSeverities={severitySelectionRedux}
          severityCount={severityCount}
          title={i18n.USER_RISK}
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

UserRiskScoreTableComponent.displayName = 'UserRiskScoreTableComponent';

export const UserRiskScoreTable = React.memo(UserRiskScoreTableComponent);

UserRiskScoreTable.displayName = 'UserRiskScoreTable';
