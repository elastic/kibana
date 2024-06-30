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
/**
 * Generates id for ES|QL alert.
 * Id is generated as hash of event properties and rule/space config identifiers.
 * This would allow to deduplicate alerts, generated from the same event.
 */
export const generateAlertId = ({
  event,
  spaceId,
  completeRule,
  tuple,
  isRuleAggregating,
  index,
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
}) => {
  const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();

  return !isRuleAggregating && event._id
    ? objectHash([event._id, event._version, event._index, `${spaceId}:${completeRule.alertId}`])
    : objectHash([
        ruleRunId,
        completeRule.ruleParams.query,
        `${spaceId}:${completeRule.alertId}`,
        index,
      ]);
};
