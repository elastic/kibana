/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useRiskScoreBetter } from '../../containers/risk_score_better';
import { HostsComponentsQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { RiskScoreBetterTable } from '../../components/risk_score_better_table';
import { useRiskScoreKpi } from '../../containers/kpi_hosts/risky_hosts';

const RiskScoreBetterTableManage = manageQuery(RiskScoreBetterTable);

export const RiskScoreBetterQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  const [loading, { data, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch }] =
    useRiskScoreBetter({
      docValueFields,
      endDate,
      filterQuery,
      skip,
      startDate,
      type,
    });

  const { response } = useRiskScoreKpi({
    filterQuery,
    from: startDate,
    to: endDate,
  });
  console.log('response', { filterQuery, response });

  return (
    <RiskScoreBetterTableManage
      deleteQuery={deleteQuery}
      data={data}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      severityCount={response?.riskyHosts ?? {}}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

RiskScoreBetterQueryTabBody.displayName = 'RiskScoreBetterQueryTabBody';
