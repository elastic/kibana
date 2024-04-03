/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useEntityAnalyticsRoutes } from '../api';
import { RiskEngineStatus } from '../../../../common/entity_analytics/risk_engine/types';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
const FETCH_RISK_ENGINE_STATUS = ['GET', 'FETCH_RISK_ENGINE_STATUS'];

export const useInvalidateRiskEngineStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(FETCH_RISK_ENGINE_STATUS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

interface RiskScoreModuleStatus {
  isLoading: boolean;
  installed?: boolean;
}

export const useIsNewRiskScoreModuleInstalled = (): RiskScoreModuleStatus => {
  const { data: riskEngineStatus, isLoading } = useRiskEngineStatus();

  if (isLoading) {
    return { isLoading: true };
  }

  return { isLoading: false, installed: !!riskEngineStatus?.isNewRiskScoreModuleInstalled };
};

export const useRiskEngineStatus = () => {
  const isNewRiskScoreModuleAvailable = useIsExperimentalFeatureEnabled('riskScoringRoutesEnabled');
  const { fetchRiskEngineStatus } = useEntityAnalyticsRoutes();
  return useQuery(FETCH_RISK_ENGINE_STATUS, async ({ signal }) => {
    if (!isNewRiskScoreModuleAvailable) {
      return {
        isUpdateAvailable: false,
        isNewRiskScoreModuleInstalled: false,
        isNewRiskScoreModuleAvailable,
        risk_engine_status: null,
        legacy_risk_engine_status: null,
        is_max_amount_of_risk_engines_reached: false,
      };
    }
    const response = await fetchRiskEngineStatus({ signal });
    const isUpdateAvailable =
      response?.legacy_risk_engine_status === RiskEngineStatus.ENABLED &&
      response.risk_engine_status === RiskEngineStatus.NOT_INSTALLED;
    const isNewRiskScoreModuleInstalled =
      response.risk_engine_status !== RiskEngineStatus.NOT_INSTALLED;
    return {
      isUpdateAvailable,
      isNewRiskScoreModuleInstalled,
      isNewRiskScoreModuleAvailable,
      ...response,
    };
  });
};
