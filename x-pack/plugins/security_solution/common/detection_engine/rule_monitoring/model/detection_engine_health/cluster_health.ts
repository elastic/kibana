/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { RuleStats, StatsHistory } from './health_stats';

/**
 * Health calculation parameters for the whole cluster.
 */
export type ClusterHealthParameters = HealthParameters;

/**
 * Health calculation result for the whole cluster.
 */
export interface ClusterHealthSnapshot extends HealthSnapshot {
  /**
   * Health stats at the moment of the calculation request.
   */
  stats_at_the_moment: ClusterHealthStatsAtTheMoment;

  /**
   * Health stats calculated over the interval specified in the health parameters.
   */
  stats_over_interval: ClusterHealthStatsOverInterval;

  /**
   * History of change of the same health stats during the interval.
   */
  history_over_interval: StatsHistory<ClusterHealthStatsOverInterval>;
}

/**
 * Health stats at the moment of the calculation request.
 */
export type ClusterHealthStatsAtTheMoment = RuleStats;

/**
 * Health stats calculated over a given interval.
 */
export interface ClusterHealthStatsOverInterval {
  // TODO: https://github.com/elastic/kibana/issues/125642 Implement and delete this `message`
  message: 'Not implemented';
}
