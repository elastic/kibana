/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, noop } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';

import { UsersComponentsQueryProps } from './types';

import { manageQuery } from '../../../common/components/page/manage_query';
import { UsersTable } from '../../components/all_users';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { UsersQueries } from '../../../../common/search_strategy/security_solution/users';
import * as i18n from './translations';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { usersSelectors } from '../../store';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const UsersTableManage = manageQuery(UsersTable);

const QUERY_ID = 'UsersTable';

export const AllUsersQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  docValueFields,
  deleteQuery,
}: UsersComponentsQueryProps) => {
  const { toggleStatus } = useQueryToggle(QUERY_ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const getUsersSelector = useMemo(() => usersSelectors.allUsersSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) => getUsersSelector(state));

  const {
    loading,
    result: { users, pageInfo, totalCount },
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.users>({
    factoryQueryType: UsersQueries.users,
    initialResult: {
      users: [],
      totalCount: 0,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.ERROR_FETCHING_USERS_DATA,
    abort: querySkip,
  });

  useEffect(() => {
    if (!querySkip) {
      search({
        filterQuery,
        defaultIndex: indexNames,
        docValueFields,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        pagination: generateTablePaginationOptions(activePage, limit),
        sort,
      });
    }
  }, [
    search,
    startDate,
    endDate,
    filterQuery,
    indexNames,
    querySkip,
    docValueFields,
    activePage,
    limit,
    sort,
  ]);

  return (
    <UsersTableManage
      users={users}
      deleteQuery={deleteQuery}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={QUERY_ID}
      inspect={inspect}
      loading={loading}
      loadPage={noop} // It isn't necessary because PaginatedTable updates redux store and we load the page when activePage updates on the store
      refetch={refetch}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      setQuery={setQuery}
      totalCount={totalCount}
      type={type}
      sort={sort}
      setQuerySkip={setQuerySkip}
    />
  );
};

AllUsersQueryTabBody.displayName = 'AllUsersQueryTabBody';
