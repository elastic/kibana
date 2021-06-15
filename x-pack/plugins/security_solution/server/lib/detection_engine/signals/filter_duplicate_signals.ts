/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WrappedSignalHit } from './types';

export const filterDuplicateSignals = (ruleId: string, signals: WrappedSignalHit[]) => {
  return signals.filter(
    (doc) => !doc._source.signal?.ancestors.some((ancestor) => ancestor.rule === ruleId)
  );
};
