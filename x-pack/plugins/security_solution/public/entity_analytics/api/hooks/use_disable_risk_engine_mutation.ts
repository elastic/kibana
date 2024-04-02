/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../api';
import { useInvalidateRiskEngineStatusQuery } from './use_risk_engine_status';
import type {
  EnableRiskEngineResponse,
  EnableDisableRiskEngineErrorResponse,
} from '../../../../server/lib/entity_analytics/types';

export const DISABLE_RISK_ENGINE_MUTATION_KEY = ['POST', 'DISABLE_RISK_ENGINE'];

export const useDisableRiskEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { disableRiskEngine } = useEntityAnalyticsRoutes();

  return useMutation<EnableRiskEngineResponse, EnableDisableRiskEngineErrorResponse>(
    () => disableRiskEngine(),
    {
      ...options,
      mutationKey: DISABLE_RISK_ENGINE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateRiskEngineStatusQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
