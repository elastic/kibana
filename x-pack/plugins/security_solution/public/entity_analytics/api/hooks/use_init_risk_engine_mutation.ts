/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  InitRiskEngineRequestBody,
  InitRiskEngineErrorResponse,
  InitRiskEngineResponse,
} from '../../../../common/api/entity_analytics/risk_engine/engine_init_route.gen';
import type { TaskManagerUnavailableResponse } from '../../../../common/api/entity_analytics/common';
import { useEntityAnalyticsRoutes } from '../api';
import { useInvalidateRiskEngineStatusQuery } from './use_risk_engine_status';
import * as i18n from '../../translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const INIT_RISK_ENGINE_STATUS_KEY = ['POST', 'INIT_RISK_ENGINE'];
const toastOptions = {
  toastLifeTimeMs: 5000,
};

export const useInitRiskEngineMutation = (
  options?: UseMutationOptions<
    InitRiskEngineResponse,
    { body: InitRiskEngineErrorResponse | TaskManagerUnavailableResponse },
    InitRiskEngineRequestBody
  >
) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { initRiskEngine } = useEntityAnalyticsRoutes();
  const { addSuccess } = useAppToasts();

  return useMutation<
    InitRiskEngineResponse,
    { body: InitRiskEngineErrorResponse | TaskManagerUnavailableResponse },
    InitRiskEngineRequestBody
  >((params) => initRiskEngine(params), {
    ...options,
    mutationKey: INIT_RISK_ENGINE_STATUS_KEY,
    onSuccess: () => {
      addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, toastOptions);
    },
    onSettled: (...args) => {
      invalidateRiskEngineStatusQuery();

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
