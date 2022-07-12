/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { noop } from 'lodash/fp';

import type { UsersComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { State } from '../../../common/store';

import { UserRiskScoreTable } from '../../components/user_risk_score_table';
import { usersSelectors } from '../../store';
import {
  UserRiskScoreQueryId,
  useUserRiskScore,
  useUserRiskScoreKpi,
} from '../../../risk_score/containers';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const UserRiskScoreTableManage = manageQuery(UserRiskScoreTable);

export const UserRiskScoreQueryTabBody = ({
  filterQuery,
  skip,
  setQuery,
  type,
  deleteQuery,
}: UsersComponentsQueryProps) => {
  const getUserRiskScoreSelector = useMemo(() => usersSelectors.userRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUserRiskScoreSelector(state)
  );

  const pagination = useMemo(
    () => ({
      cursorStart: activePage * limit,
      querySize: limit,
    }),
    [activePage, limit]
  );

  const { toggleStatus } = useQueryToggle(UserRiskScoreQueryId.USERS_BY_RISK);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const [loading, { data, totalCount, inspect, isInspected, refetch }] = useUserRiskScore({
    filterQuery,
    skip: querySkip,
    pagination,
    sort,
  });

  const { severityCount, loading: isKpiLoading } = useUserRiskScoreKpi({
    filterQuery,
    skip: querySkip,
  });

  return (
    <UserRiskScoreTableManage
      deleteQuery={deleteQuery}
      data={data ?? []}
      id={UserRiskScoreQueryId.USERS_BY_RISK}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading || isKpiLoading}
      loadPage={noop} // It isn't necessary because PaginatedTable updates redux store and we load the page when activePage updates on the store
      refetch={refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
      severityCount={severityCount}
      totalCount={totalCount}
      type={type}
    />
  );
};

UserRiskScoreQueryTabBody.displayName = 'UserRiskScoreQueryTabBody';
