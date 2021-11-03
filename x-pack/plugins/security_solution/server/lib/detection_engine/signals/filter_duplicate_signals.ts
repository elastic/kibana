/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WrappedRACAlert } from '../rule_types/types';
import { Ancestor, SimpleHit, WrappedSignalHit } from './types';

export const filterDuplicateSignals = (
  ruleId: string,
  signals: SimpleHit[],
  isRuleRegistryEnabled: boolean
) => {
  // TODO: handle alerts-on-legacy-alerts
  if (!isRuleRegistryEnabled) {
    return (signals as WrappedSignalHit[]).filter(
      (doc) => !doc._source.signal?.ancestors.some((ancestor) => ancestor.rule === ruleId)
    );
  } else {
    return (signals as WrappedRACAlert[]).filter(
      (doc) =>
        !(doc._source['kibana.alert.ancestors'] as Ancestor[]).some(
          (ancestor) => ancestor.rule === ruleId
        )
    );
  }
};
