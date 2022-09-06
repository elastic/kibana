/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

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
};

export const indexLifecyclePhaseRt = t.type({
  indexLifecyclePhase: t.union([
    t.literal(IndexLifecyclePhaseSelectOption.All),
    t.literal(IndexLifecyclePhaseSelectOption.Hot),
    t.literal(IndexLifecyclePhaseSelectOption.Warm),
    t.literal(IndexLifecyclePhaseSelectOption.Cold),
    t.literal(IndexLifecyclePhaseSelectOption.Frozen),
  ]),
});
