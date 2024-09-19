/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useRiskScore } from '../../containers/risk_score';
import { RiskScoreQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { RiskScoreTable } from '../../components/risk_score_table';

const RiskScoreTableManage = manageQuery(RiskScoreTable);

export const RiskScoreQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}: RiskScoreQueryProps) => {
  const [loading, { data, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch }] =
    useRiskScore({ docValueFields, endDate, filterQuery, indexNames, skip, startDate, type });

  return (
    <RiskScoreTableManage
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
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

RiskScoreQueryTabBody.displayName = 'RiskScoreQueryTabBody';
