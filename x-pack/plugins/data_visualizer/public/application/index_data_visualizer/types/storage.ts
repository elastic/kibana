/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FrozenTierPreference } from '@kbn/ml-date-picker';

import { RandomSamplerOption } from '../constants/random_sampler';

export const DV_FROZEN_TIER_PREFERENCE = 'dataVisualizer.frozenDataTierPreference';
export const DV_RANDOM_SAMPLER_PREFERENCE = 'dataVisualizer.randomSamplerPreference';
export const DV_RANDOM_SAMPLER_P_VALUE = 'dataVisualizer.randomSamplerPValue';

export type DV = Partial<{
  [DV_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
  [DV_RANDOM_SAMPLER_PREFERENCE]: RandomSamplerOption;
  [DV_RANDOM_SAMPLER_P_VALUE]: number;
}> | null;

export type DVKey = keyof Exclude<DV, null>;

export type DVStorageMapped<T extends DVKey> = T extends typeof DV_FROZEN_TIER_PREFERENCE
  ? FrozenTierPreference | undefined
  : T extends typeof DV_RANDOM_SAMPLER_PREFERENCE
  ? RandomSamplerOption | undefined
  : T extends typeof DV_RANDOM_SAMPLER_P_VALUE
  ? number | undefined
  : null;

export const DV_STORAGE_KEYS = [
  DV_FROZEN_TIER_PREFERENCE,
  DV_RANDOM_SAMPLER_PREFERENCE,
  DV_RANDOM_SAMPLER_P_VALUE,
] as const;
