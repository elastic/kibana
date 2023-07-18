/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { RuleExecutionStats, RuleStats, StatsHistory } from './health_stats';

/**
 * Health calculation parameters for the current Kibana space.
 */
export type SpaceHealthParameters = HealthParameters;

/**
 * Health calculation result for the current Kibana space.
 */
export interface SpaceHealthSnapshot extends HealthSnapshot {
  /**
   * Health stats at the moment of the calculation request.
   */
  stats_at_the_moment: SpaceHealthStatsAtTheMoment;

  /**
   * Health stats calculated over the interval specified in the health parameters.
   */
  stats_over_interval: SpaceHealthStatsOverInterval;

  /**
   * History of change of the same health stats during the interval.
   */
  history_over_interval: StatsHistory<SpaceHealthStatsOverInterval>;
}

/**
 * Health stats at the moment of the calculation request.
 */
export type SpaceHealthStatsAtTheMoment = RuleStats;

/**
 * Health stats calculated over a given interval.
 */
export type SpaceHealthStatsOverInterval = RuleExecutionStats;
