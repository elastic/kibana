/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import type { CompleteRule, EsqlRuleParams } from '../../../rule_schema';
import type { SignalSource } from '../../types';
import type { SuppressionTerm } from '../../utils/suppression_utils';
/**
 * generates id for ES|QL alert
 */
export const generateAlertId = ({
  event,
  spaceId,
  completeRule,
  tuple,
  isRuleAggregating,
  index,
  suppressionTerms,
}: {
  isRuleAggregating: boolean;
  event: estypes.SearchHit<SignalSource>;
  spaceId: string | null | undefined;
  completeRule: CompleteRule<EsqlRuleParams>;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  index: number;
  suppressionTerms?: SuppressionTerm[];
}) => {
  const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();

  return !isRuleAggregating && event._id
    ? objectHash([
        event._id,
        event._version,
        event._index,
        `${spaceId}:${completeRule.alertId}`,
        ...(suppressionTerms ? [suppressionTerms] : []),
      ])
    : objectHash([
        ruleRunId,
        completeRule.ruleParams.query,
        `${spaceId}:${completeRule.alertId}`,
        index,
      ]);
};
