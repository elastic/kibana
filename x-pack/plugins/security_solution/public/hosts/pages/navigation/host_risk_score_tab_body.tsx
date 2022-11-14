/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { noop } from 'lodash/fp';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { RiskScoresDeprecated } from '../../../common/components/risk_score/risk_score_deprecated';
import type { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRiskScoreTable } from '../../components/host_risk_score_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';
import type { State } from '../../../common/store';
import {
  HostRiskScoreQueryId,
  useHostRiskScore,
  useHostRiskScoreKpi,
} from '../../../risk_score/containers';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { EMPTY_SEVERITY_COUNT, RiskScoreEntity } from '../../../../common/search_strategy';
import { EntityAnalyticsHostRiskScoreDisable } from '../../../common/components/risk_score/risk_score_disabled/host_risk_score_disabled';
import { RiskScoresNoDataDetected } from '../../../common/components/risk_score/risk_score_onboarding/risk_score_no_data_detected';

const HostRiskScoreTableManage = manageQuery(HostRiskScoreTable);

export const HostRiskScoreQueryTabBody = ({
  deleteQuery,
  filterQuery,
  skip,
  setQuery,
  type,
}: HostsComponentsQueryProps) => {
  const getHostRiskScoreSelector = useMemo(() => hostsSelectors.hostRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getHostRiskScoreSelector(state, hostsModel.HostsType.page)
  );
  const getHostRiskScoreFilterQuerySelector = useMemo(
    () => hostsSelectors.hostRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    getHostRiskScoreFilterQuerySelector(state, hostsModel.HostsType.page)
  );

  const pagination = useMemo(
    () => ({
      cursorStart: activePage * limit,
      querySize: limit,
    }),
    [activePage, limit]
  );

  const { toggleStatus } = useQueryToggle(HostRiskScoreQueryId.HOSTS_BY_RISK);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(!toggleStatus);
  }, [toggleStatus]);
  const { from, to } = useGlobalTime();
  const timerange = useMemo(() => ({ from, to }), [from, to]);

  const [
    loading,
    { data, totalCount, inspect, isInspected, isDeprecated, refetch, isModuleEnabled },
  ] = useHostRiskScore({
    filterQuery,
    skip: querySkip,
    pagination,
    sort,
    timerange,
  });

  const { severityCount, loading: isKpiLoading } = useHostRiskScoreKpi({
    filterQuery,
    skip: querySkip,
  });

  if (!isModuleEnabled && !loading) {
    return <EntityAnalyticsHostRiskScoreDisable refetch={refetch} timerange={timerange} />;
  }

  if (isDeprecated && !loading) {
    return (
      <RiskScoresDeprecated
        refetch={refetch}
        timerange={timerange}
        entityType={RiskScoreEntity.host}
      />
    );
  }

  if (
    !loading &&
    isModuleEnabled &&
    severitySelectionRedux.length === 0 &&
    data &&
    data.length === 0
  ) {
    return <RiskScoresNoDataDetected entityType={RiskScoreEntity.host} refetch={refetch} />;
  }

  return (
    <HostRiskScoreTableManage
      deleteQuery={deleteQuery}
      data={data ?? []}
      id={HostRiskScoreQueryId.HOSTS_BY_RISK}
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

HostRiskScoreQueryTabBody.displayName = 'HostRiskScoreQueryTabBody';
