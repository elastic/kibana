/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { HostRulesHit, HostRulesEdges, HostRulesFields } from '../../../../../../common';

export const formatHostRulesData = (buckets: HostRulesHit[]): HostRulesEdges[] =>
  buckets.map((bucket) => ({
    node: {
      _id: bucket.key,
      [HostRulesFields.hits]: bucket.doc_count,
      [HostRulesFields.riskScore]: getOr(0, 'risk_score.value', bucket),
      [HostRulesFields.ruleName]: bucket.key,
      [HostRulesFields.ruleType]: getOr(0, 'rule_type.buckets[0].key', bucket),
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
