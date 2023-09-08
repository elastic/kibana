/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { SETUP_HEALTH_URL } from '../../../../../common/api/detection_engine/rule_monitoring';
import { api } from '../../api';

export const SETUP_DETECTION_ENGINE_HEALTH_API_MUTATION_KEY = ['POST', SETUP_HEALTH_URL];

export const useSetupDetectionEngineHealthApi = (options?: UseMutationOptions<void, Error>) => {
  const { mutate: setupDetectionEngineHealthApi } = useMutation(
    () => api.setupDetectionEngineHealthApi(),
    {
      ...options,
      mutationKey: SETUP_DETECTION_ENGINE_HEALTH_API_MUTATION_KEY,
    }
  );

  useEffect(() => {
    setupDetectionEngineHealthApi();
  }, [setupDetectionEngineHealthApi]);
};
