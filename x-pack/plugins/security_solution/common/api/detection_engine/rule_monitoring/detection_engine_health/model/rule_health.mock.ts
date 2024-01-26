/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../model/rule_schema/mocks';
import { healthStatsMock } from './health_stats.mock';
import type { RuleHealthSnapshot } from './rule_health';

const getEmptyRuleHealthSnapshot = (): RuleHealthSnapshot => {
  return {
    state_at_the_moment: {
      rule: getRulesSchemaMock(),
    },
    stats_over_interval: healthStatsMock.getEmptyHealthOverviewStats(),
    history_over_interval: {
      buckets: [
        {
          timestamp: '2023-05-15T16:12:14.967Z',
          stats: healthStatsMock.getEmptyHealthOverviewStats(),
        },
      ],
    },
  };
};

export const ruleHealthSnapshotMock = {
  getEmptyRuleHealthSnapshot,
};
