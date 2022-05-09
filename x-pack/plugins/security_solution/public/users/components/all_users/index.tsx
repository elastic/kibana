/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { UserDetailsLink } from '../../../common/components/links';
import { getOrEmptyTagFromValue } from '../../../common/components/empty_value';

import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
} from '../../../common/components/paginated_table';

import { getRowItemDraggables } from '../../../common/components/tables/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

import * as i18n from './translations';
import { usersActions, usersModel, usersSelectors } from '../../store';
import { User } from '../../../../common/search_strategy/security_solution/users/all';
import { SortUsersField } from '../../../../common/search_strategy/security_solution/users/common';

const tableType = usersModel.UsersTableType.allUsers;

interface UsersTableProps {
  users: User[];
  fakeTotalCount: number;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  id: string;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: usersModel.UsersType;
  sort: SortUsersField;
  setQuerySkip: (skip: boolean) => void;
}

export type UsersTableColumns = [
  Columns<User['name']>,
  Columns<User['lastSeen']>,
  Columns<User['domain']>
];

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

const getUsersColumns = (): UsersTableColumns => [
  {
    field: 'name',
    name: i18n.USER_NAME,
    truncateText: false,
    sortable: true,
    mobileOptions: { show: true },
    render: (name) =>
      name != null && name.length > 0
        ? getRowItemDraggables({
            rowItems: [name],
            attrName: 'user.name',
            idPrefix: `users-table-${name}-name`,
            render: (item) => <UserDetailsLink userName={item} />,
          })
        : getOrEmptyTagFromValue(name),
  },
  {
    field: 'lastSeen',
    name: i18n.LAST_SEEN,
    sortable: true,
    truncateText: false,
    mobileOptions: { show: true },
    render: (lastSeen) => <FormattedRelativePreferenceDate value={lastSeen} />,
  },
  {
    field: 'domain',
    name: i18n.DOMAIN,
    sortable: false,
    truncateText: false,
    mobileOptions: { show: true },
    render: (domain) =>
      domain != null && domain.length > 0
        ? getRowItemDraggables({
            rowItems: [domain],
            attrName: 'user.domain',
            idPrefix: `users-table-${domain}-domain`,
          })
        : getOrEmptyTagFromValue(domain),
  },
];

const UsersTableComponent: React.FC<UsersTableProps> = ({
  users,
  totalCount,
  type,
  id,
  fakeTotalCount,
  loading,
  loadPage,
  showMorePagesIndicator,
  sort,
  setQuerySkip,
}) => {
  const dispatch = useDispatch();
  const getUsersSelector = useMemo(() => usersSelectors.allUsersSelector(), []);
  const { activePage, limit } = useDeepEqualSelector((state) => getUsersSelector(state));

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
              sort: newSort as SortUsersField,
              tableType,
            })
          );
        }
      }
    },
    [dispatch, sort]
  );
  const columns = useMemo(() => getUsersColumns(), []);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={i18n.USERS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      pageOfItems={users}
      showMorePagesIndicator={showMorePagesIndicator}
      totalCount={fakeTotalCount}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
      sorting={sort}
      onChange={onSort}
      setQuerySkip={setQuerySkip}
    />
  );
};

UsersTableComponent.displayName = 'UsersTableComponent';

export const UsersTable = React.memo(UsersTableComponent);
