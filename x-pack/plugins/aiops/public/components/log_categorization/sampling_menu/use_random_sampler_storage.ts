/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStorage } from '@kbn/ml-local-storage';
import { RANDOM_SAMPLER_OPTION, DEFAULT_PROBABILITY } from '@kbn/ml-random-sampler-utils';
import type { AiOpsKey, AiOpsStorageMapped } from '../../../types/storage';
import {
  AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE,
  AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE,
} from '../../../types/storage';

export type RandomSamplerStorage = ReturnType<typeof useRandomSamplerStorage>;

export function useRandomSamplerStorage() {
  const [randomSamplerMode, setRandomSamplerMode] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE>
  >(AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE, RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);

  const [randomSamplerProbability, setRandomSamplerProbability] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE>
  >(AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE, DEFAULT_PROBABILITY);

  return {
    randomSamplerMode,
    setRandomSamplerMode,
    randomSamplerProbability,
    setRandomSamplerProbability,
  };
}
