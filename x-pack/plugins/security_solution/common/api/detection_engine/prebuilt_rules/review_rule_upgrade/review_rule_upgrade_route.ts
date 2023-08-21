/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleObjectId, RuleSignatureId, RuleTagArray } from '../../model';
import type { DiffableRule, PartialRuleDiff } from '../model';

export interface ReviewRuleUpgradeResponseBody {
  /** Aggregated info about all rules available for upgrade */
  stats: RuleUpgradeStatsForReview;

  /** Info about individual rules: one object per each rule available for upgrade */
  rules: RuleUpgradeInfoForReview[];
}

export interface RuleUpgradeStatsForReview {
  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_rules_to_upgrade_total: number;

  /** A union of all tags of all rules available for upgrade */
  tags: RuleTagArray;
}

export interface RuleUpgradeInfoForReview {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  rule: DiffableRule;
  target_rule: DiffableRule;
  diff: PartialRuleDiff;
  revision: number;
}
