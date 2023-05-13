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
} from '../../../../../../common/detection_engine/rule_monitoring';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

export interface IDetectionEngineHealthClient {
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealthSnapshot>;
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealthSnapshot>;
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealthSnapshot>;
}
