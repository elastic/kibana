/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  InitRiskEngineErrorResponse,
  InitRiskEngineResponse,
} from '../../../../common/api/entity_analytics/risk_engine/engine_init_route.gen';
import type { TaskManagerUnavailableResponse } from '../../../../common/api/entity_analytics/common';
import { useEntityAnalyticsRoutes } from '../api';
import { useInvalidateRiskEngineStatusQuery } from './use_risk_engine_status';

export const INIT_RISK_ENGINE_STATUS_KEY = ['POST', 'INIT_RISK_ENGINE'];

export const useInitRiskEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { initRiskEngine } = useEntityAnalyticsRoutes();

  return useMutation<
    InitRiskEngineResponse,
    { body: InitRiskEngineErrorResponse | TaskManagerUnavailableResponse }
  >(() => initRiskEngine(), {
    ...options,
    mutationKey: INIT_RISK_ENGINE_STATUS_KEY,
    onSettled: (...args) => {
      invalidateRiskEngineStatusQuery();

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
