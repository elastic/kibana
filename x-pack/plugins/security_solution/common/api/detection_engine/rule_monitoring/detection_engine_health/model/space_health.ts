/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { HealthOverviewStats, HealthOverviewState, HealthHistory } from './health_stats';

/**
 * Health calculation parameters for the current Kibana space.
 */
export type SpaceHealthParameters = HealthParameters;

/**
 * Health calculation result for the current Kibana space.
 */
export interface SpaceHealthSnapshot extends HealthSnapshot {
  /**
   * Health state at the moment of the calculation request.
   */
  state_at_the_moment: SpaceHealthState;

  /**
   * Health stats calculated over the interval specified in the health parameters.
   */
  stats_over_interval: SpaceHealthStats;

  /**
   * History of change of the same health stats during the interval.
   */
  history_over_interval: HealthHistory<SpaceHealthStats>;
}

/**
 * Health state at the moment of the calculation request.
 */
export type SpaceHealthState = HealthOverviewState;

/**
 * Health stats calculated over a given interval.
 */
export type SpaceHealthStats = HealthOverviewStats;
