/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../model';
import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { HealthOverviewStats, HealthHistory } from './health_stats';

/**
 * Health calculation parameters for a given rule.
 */
export interface RuleHealthParameters extends HealthParameters {
  /**
   * Saved object ID of the rule.
   */
  rule_id: string;
}

/**
 * Health calculation result for a given rule.
 */
export interface RuleHealthSnapshot extends HealthSnapshot {
  /**
   * Health state at the moment of the calculation request.
   */
  state_at_the_moment: RuleHealthState;

  /**
   * Health stats calculated over the interval specified in the health parameters.
   */
  stats_over_interval: RuleHealthStats;

  /**
   * History of change of the same health stats during the interval.
   */
  history_over_interval: HealthHistory<RuleHealthStats>;
}

/**
 * Health state at the moment of the calculation request.
 */
export interface RuleHealthState {
  /**
   * Rule object including its current execution summary.
   */
  rule: RuleResponse;
}

/**
 * Health stats calculated over a given interval.
 */
export type RuleHealthStats = HealthOverviewStats;
