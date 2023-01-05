/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AIOPS_FROZEN_TIER_PREFERENCE = 'aiops.frozenDataTierPreference';

export const FROZEN_TIER_PREFERENCE = {
  EXCLUDE: 'exclude-frozen',
  INCLUDE: 'include-frozen',
} as const;

export type FrozenTierPreference =
  typeof FROZEN_TIER_PREFERENCE[keyof typeof FROZEN_TIER_PREFERENCE];

export type AiOps = Partial<{
  [AIOPS_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
}> | null;

export type AiOpsKey = keyof Exclude<AiOps, null>;

export type AiOpsStorageMapped<T extends AiOpsKey> = T extends typeof AIOPS_FROZEN_TIER_PREFERENCE
  ? FrozenTierPreference | undefined
  : null;

export const AIOPS_STORAGE_KEYS = [AIOPS_FROZEN_TIER_PREFERENCE] as const;
