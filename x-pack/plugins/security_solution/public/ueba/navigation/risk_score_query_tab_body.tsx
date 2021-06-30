/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useRiskScore } from '../../containers/ueba';
import { UebaComponentsQueryProps } from './types';
import { UebaTable } from '../../components/ueba_table';
import { manageQuery } from '../../../common/components/page/manage_query';

const UebaTableManage = manageQuery(UebaTable);

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
}: UebaComponentsQueryProps) => {
  const [
    loading,
    { ueba, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useRiskScore({ docValueFields, endDate, filterQuery, indexNames, skip, startDate, type });

  return (
    <UebaTableManage
      deleteQuery={deleteQuery}
      data={ueba}
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
