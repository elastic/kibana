/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { noop } from 'lodash/fp';
import { useRiskScoreBetter } from '../../containers/risk_score_better';
import { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRiskScoreTable } from '../../components/host_risk_score_table';
import { useRiskScoreKpi } from '../../containers/kpi_hosts/risky_hosts';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';
import { State } from '../../../common/store';
import { HostRiskScoreQueryId } from '../../../common/containers/hosts_risk/types';

const HostRiskScoreTableManage = manageQuery(HostRiskScoreTable);

export const HostRiskScoreQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  const getRiskScoreBetterSelector = useMemo(() => hostsSelectors.hostRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getRiskScoreBetterSelector(state, hostsModel.HostsType.page)
  );

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const pagination = useMemo(
    () => ({
      cursorStart: activePage * limit,
      querySize: limit,
    }),
    [activePage, limit]
  );

  const [loading, { data, totalCount, inspect, isInspected, refetch }] = useRiskScoreBetter({
    timerange,
    filterQuery,
    skip,
    pagination,
    sort,
  });

  const { severityCount, loading: isKpiLoading } = useRiskScoreKpi({
    filterQuery,
    from: startDate,
    to: endDate,
  });

  return (
    <HostRiskScoreTableManage
      deleteQuery={deleteQuery}
      data={data}
      id={HostRiskScoreQueryId.HOSTS_BY_RISK}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading || isKpiLoading}
      loadPage={noop} // It isn't necessary because PaginatedTable updates redux store and we load the page when activePage updates on the store
      refetch={refetch}
      setQuery={setQuery}
      severityCount={severityCount}
      totalCount={totalCount}
      type={type}
    />
  );
};

HostRiskScoreQueryTabBody.displayName = 'HostRiskScoreQueryTabBody';
