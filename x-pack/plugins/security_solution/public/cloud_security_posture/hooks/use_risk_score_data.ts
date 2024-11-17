/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  RiskScoreEntity,
  type HostRiskScore,
  type UserRiskScore,
  buildHostNamesFilter,
  buildUserNamesFilter,
} from '../../../common/search_strategy';
import { useRiskScore } from '../../entity_analytics/api/hooks/use_risk_score';
import { FIRST_RECORD_PAGINATION } from '../../entity_analytics/common';

export const useRiskScoreData = ({
  isUsingHostName,
  name,
}: {
  isUsingHostName: boolean;
  name: string;
}) => {
  const buildFilterQuery = useMemo(
    () => (isUsingHostName ? buildHostNamesFilter([name]) : buildUserNamesFilter([name])),
    [isUsingHostName, name]
  );
  const { data } = useRiskScore({
    riskEntity: isUsingHostName ? RiskScoreEntity.host : RiskScoreEntity.user,
    filterQuery: buildFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const riskData = data?.[0];

  const isRiskScoreExist = isUsingHostName
    ? !!(riskData as HostRiskScore)?.host.risk
    : !!(riskData as UserRiskScore)?.user.risk;

  return { isRiskScoreExist };
};
