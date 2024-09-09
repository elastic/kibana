/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum IndexLifecyclePhaseSelectOption {
  All = 'all',
  Hot = 'hot',
  Warm = 'warm',
  Cold = 'cold',
  Frozen = 'frozen',
}

export const indexLifeCyclePhaseToDataTier = {
  [IndexLifecyclePhaseSelectOption.Hot]: 'data_hot',
  [IndexLifecyclePhaseSelectOption.Warm]: 'data_warm',
  [IndexLifecyclePhaseSelectOption.Cold]: 'data_cold',
  [IndexLifecyclePhaseSelectOption.Frozen]: 'data_frozen',
} as const;

export type IndexLifeCycleDataTier =
  (typeof indexLifeCyclePhaseToDataTier)[keyof typeof indexLifeCyclePhaseToDataTier];
