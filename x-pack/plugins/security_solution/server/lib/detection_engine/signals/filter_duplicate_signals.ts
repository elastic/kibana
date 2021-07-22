/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WrappedRACAlert } from '../rule_types/types';
import { Ancestor, SimpleHit, WrappedSignalHit } from './types';

const isWrappedSignalHit = (
  signals: SimpleHit[],
  isRuleRegistryEnabled: boolean
): signals is WrappedSignalHit[] => {
  return !isRuleRegistryEnabled;
};

const isWrappedRACAlert = (
  signals: SimpleHit[],
  isRuleRegistryEnabled: boolean
): signals is WrappedRACAlert[] => {
  return isRuleRegistryEnabled;
};

export const filterDuplicateSignals = (
  ruleId: string,
  signals: SimpleHit[],
  isRuleRegistryEnabled: boolean
) => {
  if (isWrappedSignalHit(signals, isRuleRegistryEnabled)) {
    return signals.filter(
      (doc) => !doc._source.signal?.ancestors.some((ancestor) => ancestor.rule === ruleId)
    );
  } else if (isWrappedRACAlert(signals, isRuleRegistryEnabled)) {
    return signals.filter(
      (doc) =>
        !(doc._source.signal['kibana.alert.ancestors'] as Ancestor[]).some(
          (ancestor) => ancestor.rule === ruleId
        )
    );
  } else {
    return signals;
  }
};
