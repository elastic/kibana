/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { noop } from 'lodash/fp';

import { EnableRiskScore } from '../../../components/risk_score/enable_risk_score';
import type { UsersComponentsQueryProps } from './types';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { State } from '../../../../common/store';

import { UserRiskScoreTable } from '../../components/user_risk_score_table';
import { usersSelectors } from '../../store';
import {
  UserRiskScoreQueryId,
  useRiskScore,
  useRiskScoreKpi,
} from '../../../containers/risk_score';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { EMPTY_SEVERITY_COUNT, RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskScoresNoDataDetected } from '../../../components/risk_score/risk_score_onboarding/risk_score_no_data_detected';

const UserRiskScoreTableManage = manageQuery(UserRiskScoreTable);

export const UserRiskScoreQueryTabBody = ({
  deleteQuery,
  endDate: to,
  filterQuery,
  setQuery,
  skip,
  startDate: from,
  type,
}: UsersComponentsQueryProps) => {
  const getUserRiskScoreSelector = useMemo(() => usersSelectors.userRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUserRiskScoreSelector(state)
  );
  const getUserRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.userRiskScoreSeverityFilterSelector(),
    []
  );
  const userSeveritySelectionRedux = useDeepEqualSelector((state: State) =>
    getUserRiskScoreFilterQuerySelector(state)
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

  const timerange = useMemo(() => ({ from, to }), [from, to]);

  const {
    data,
    inspect,
    isDeprecated,
    isInspected,
    isModuleEnabled,
    loading,
    refetch,
    totalCount,
  } = useRiskScore({
    filterQuery,
    pagination,
    riskEntity: RiskScoreEntity.user,
    skip: querySkip,
    sort,
    timerange,
  });

  const { severityCount, loading: isKpiLoading } = useRiskScoreKpi({
    filterQuery,
    riskEntity: RiskScoreEntity.user,
    skip: querySkip,
  });

  const status = {
    isDisabled: !isModuleEnabled && !loading,
    isDeprecated: isDeprecated && !loading,
  };

  if (status.isDisabled || status.isDeprecated) {
    return (
      <EnableRiskScore
        {...status}
        entityType={RiskScoreEntity.user}
        refetch={refetch}
        timerange={timerange}
      />
    );
  }

  if (isModuleEnabled && userSeveritySelectionRedux.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={RiskScoreEntity.user} refetch={refetch} />;
  }

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
      severityCount={severityCount ?? EMPTY_SEVERITY_COUNT}
      totalCount={totalCount}
      type={type}
    />
  );
};

UserRiskScoreQueryTabBody.displayName = 'UserRiskScoreQueryTabBody';
