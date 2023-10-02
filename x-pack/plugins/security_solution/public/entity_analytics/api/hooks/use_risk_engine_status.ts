/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchRiskEngineStatus } from '../api';
import { RiskEngineStatus } from '../../../../common/risk_engine/types';
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

export const useIsNewRiskScoreModuleInstalled = () => {
  const { data: riskEngineStatus } = useRiskEngineStatus();

  return riskEngineStatus?.isNewRiskScoreModuleInstalled ?? false;
};

export const useRiskEngineStatus = () => {
  const isNewRiskScoreModuleAvailable = useIsExperimentalFeatureEnabled('riskScoringRoutesEnabled');

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
