/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWrappedRACAlert } from '../rule_types/utils';
import { Ancestor, SimpleHit } from './types';
import { isWrappedSignalHit } from './utils';

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
        !(doc._source['kibana.alert.ancestors'] as Ancestor[]).some(
          (ancestor) => ancestor.rule === ruleId
        )
    );
  } else {
    return signals;
  }
};
