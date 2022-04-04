/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getOr } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import { AuthStackByField } from '../../../../common/search_strategy/security_solution/users/authentications';
import { PaginatedTable } from '../paginated_table';

import * as i18n from './translations';
import {
  getUserDetailsAuthenticationColumns,
  getUsersPageAuthenticationColumns,
  rowItems,
} from './helpers';
import { useAuthentications } from '../../containers/authentications';
import { useQueryInspector } from '../page/manage_query';
import { useQueryToggle } from '../../containers/query_toggle';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { usersActions, usersModel, usersSelectors } from '../../../users/store';
import { AuthenticationsUserTableProps } from './types';

const TABLE_QUERY_ID = 'authenticationsUsersTableQuery';

const AuthenticationsUserTableComponent: React.FC<AuthenticationsUserTableProps> = ({
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  type,
  setQuery,
  deleteQuery,
  userName,
}) => {
  const dispatch = useDispatch();
  const { toggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const getAuthenticationsSelector = useMemo(() => usersSelectors.authenticationsSelector(), []);
  const { activePage, limit } = useDeepEqualSelector((state) => getAuthenticationsSelector(state));

  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, inspect, isInspected, refetch },
  ] = useAuthentications({
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    skip: querySkip,
    startDate,
    activePage,
    limit,
    stackByField: userName ? AuthStackByField.hostName : AuthStackByField.userName,
  });

  const columns = userName
    ? getUserDetailsAuthenticationColumns()
    : getUsersPageAuthenticationColumns();

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        usersActions.updateTableLimit({
          usersType: type,
          limit: newLimit,
          tableType: usersModel.UsersTableType.authentications,
        })
      ),
    [type, dispatch]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        usersActions.updateTableActivePage({
          activePage: newPage,
          usersType: type,
          tableType: usersModel.UsersTableType.authentications,
        })
      ),
    [type, dispatch]
  );

  useQueryInspector({
    queryId: TABLE_QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj="table-users-authentications"
      headerCount={totalCount}
      headerTitle={i18n.AUTHENTICATIONS}
      headerUnit={userName ? i18n.HOSTS_UNIT(totalCount) : i18n.USERS_UNIT(totalCount)}
      id={TABLE_QUERY_ID}
      isInspect={isInspected}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      pageOfItems={authentications}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
    />
  );
};

AuthenticationsUserTableComponent.displayName = 'AuthenticationsUserTableComponent';

export const AuthenticationsUserTable = React.memo(AuthenticationsUserTableComponent);
