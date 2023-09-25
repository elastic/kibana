/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
  RuleHealthParameters,
  RuleHealthSnapshot,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

/**
 * Calculates health of the Detection Engine overall and detection rules individually.
 */
export interface IDetectionEngineHealthClient {
  /**
   * Calculates health stats for a given rule.
   */
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealthSnapshot>;

  /**
   * Calculates health stats for all rules in the current Kibana space.
   */
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealthSnapshot>;

  /**
   * Calculates health stats for the whole cluster.
   */
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealthSnapshot>;

  /**
   * Installs assets for monitoring Detection Engine health, such as dashboards and data views.
   */
  installAssetsForMonitoringHealth(): Promise<void>;
}
