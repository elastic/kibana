/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRiskScoreBetter } from '../../containers/risk_score_better';
import { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRiskScoreTable } from '../../components/risk_score_better_table';
import { useRiskScoreKpi } from '../../containers/kpi_hosts/risky_hosts';

const HostRiskScoreTableManage = manageQuery(HostRiskScoreTable);

export const HostRiskScoreQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  const [loading, { data, totalCount, loadPage, id, inspect, isInspected, refetch }] =
    useRiskScoreBetter({
      docValueFields,
      endDate,
      filterQuery,
      skip,
      startDate,
      type,
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
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading || isKpiLoading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      severityCount={severityCount}
      totalCount={totalCount}
      type={type}
    />
  );
};

HostRiskScoreQueryTabBody.displayName = 'HostRiskScoreQueryTabBody';
