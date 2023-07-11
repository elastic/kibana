/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FrozenTierPreference } from '@kbn/ml-date-picker';
import {
  type RandomSamplerOption,
  type RandomSamplerProbability,
} from '../components/log_categorization/sampling_menu/random_sampler';

export const AIOPS_FROZEN_TIER_PREFERENCE = 'aiops.frozenDataTierPreference';
export const AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE = 'aiops.randomSamplingModePreference';
export const AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE =
  'aiops.randomSamplingProbabilityPreference';

export type AiOps = Partial<{
  [AIOPS_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
  [AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE]: RandomSamplerOption;
  [AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE]: number;
}> | null;

export type AiOpsKey = keyof Exclude<AiOps, null>;

export type AiOpsStorageMapped<T extends AiOpsKey> = T extends typeof AIOPS_FROZEN_TIER_PREFERENCE
  ? FrozenTierPreference | undefined
  : T extends typeof AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE
  ? RandomSamplerOption
  : T extends typeof AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE
  ? RandomSamplerProbability
  : null;

export const AIOPS_STORAGE_KEYS = [
  AIOPS_FROZEN_TIER_PREFERENCE,
  AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE,
  AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE,
] as const;
