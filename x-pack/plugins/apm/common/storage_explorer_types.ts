/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export enum IndexLifecyclePhase {
  Hot = 'hot',
  Warm = 'warm',
  Cold = 'cold',
  Frozen = 'frozen',
}

export const indexLifeCyclePhaseToDataTier = {
  [IndexLifecyclePhase.Hot]: 'data_hot',
  [IndexLifecyclePhase.Warm]: 'data_warm',
  [IndexLifecyclePhase.Cold]: 'data_cold',
  [IndexLifecyclePhase.Frozen]: 'data_frozen',
};

export const indexLifecyclePhaseRt = t.type({
  indexLifecyclePhase: t.union([
    t.literal(IndexLifecyclePhase.Hot),
    t.literal(IndexLifecyclePhase.Warm),
    t.literal(IndexLifecyclePhase.Cold),
    t.literal(IndexLifecyclePhase.Frozen),
  ]),
});
