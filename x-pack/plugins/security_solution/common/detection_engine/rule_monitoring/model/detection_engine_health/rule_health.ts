/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleObjectId, RuleResponse } from '../../../rule_schema';
import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { RuleExecutionStats, StatsHistory } from './health_stats';

export interface RuleHealthParameters extends HealthParameters {
  rule_id: RuleObjectId;
}

export interface RuleHealthSnapshot extends HealthSnapshot {
  stats_at_the_moment: RuleHealthStatsAtTheMoment;
  stats_over_interval: RuleHealthStatsOverInterval;
  history_over_interval: StatsHistory<RuleHealthStatsOverInterval>;
}

export interface RuleHealthStatsAtTheMoment {
  rule: RuleResponse;
}

export type RuleHealthStatsOverInterval = RuleExecutionStats;
