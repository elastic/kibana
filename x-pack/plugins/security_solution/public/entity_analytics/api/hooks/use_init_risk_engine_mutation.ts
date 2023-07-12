/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { initRiskEngine } from '../api';
import { useInvalidateRiskEngineStatussQuery } from './use_risk_engine_status';

export const CREATE_RULE_MUTATION_KEY = ['POST', 'INIT_RISK_ENGINE'];

export const useInitRiskEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatussQuery();

  return useMutation<{}>(() => initRiskEngine(), {
    ...options,
    mutationKey: CREATE_RULE_MUTATION_KEY,
    onSettled: (...args) => {
      invalidateRiskEngineStatusQuery();

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
