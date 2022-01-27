/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getOr, noop } from 'lodash/fp';
import { useHostRiskScore } from '../../containers/host_risk_score';
import { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRiskScoreTable } from '../../components/host_risk_score_table';
import { useRiskScoreKpi } from '../../containers/kpi_hosts/risky_hosts';
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
  const [loading, { data, totalCount, inspect, isInspected, refetch, pageInfo, loadPage }] =
    useHostRiskScore({
      filterQuery,
      timerange: {
        from: startDate,
        to: endDate,
      },
      skip,
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
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      severityCount={severityCount}
      totalCount={totalCount}
      type={type}
    />
  );
};

HostRiskScoreQueryTabBody.displayName = 'HostRiskScoreQueryTabBody';
