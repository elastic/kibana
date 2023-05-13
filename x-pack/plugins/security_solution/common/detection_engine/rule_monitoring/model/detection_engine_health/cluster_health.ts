/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { RuleStats, StatsHistory } from './health_stats';

// TODO: https://github.com/elastic/kibana/issues/125642 Implement

export type ClusterHealthParameters = HealthParameters;

export interface ClusterHealthSnapshot extends HealthSnapshot {
  stats_at_the_moment: ClusterHealthStatsAtTheMoment;
  stats_over_interval: ClusterHealthStatsOverInterval;
  history_over_interval: StatsHistory<ClusterHealthStatsOverInterval>;
}

export type ClusterHealthStatsAtTheMoment = RuleStats;

export interface ClusterHealthStatsOverInterval {
  message: 'Not implemented';
}
