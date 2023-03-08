/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleObjectId, RuleSignatureId, RuleTagArray } from '../../../rule_schema';
import type { DiffableRule } from '../../model/diff/diffable_rule/diffable_rule';
import type { PartialRuleDiff } from '../../model/diff/rule_diff/rule_diff';

export interface ReviewRuleUpgradeResponseBody {
  status_code: number;
  message: string;
  attributes: {
    /** Aggregated info about all rules available for upgrade */
    stats: RuleUpgradeStatsForReview;

    /** Info about individual rules: one object per each rule available for upgrade */
    rules: RuleUpgradeInfoForReview[];
  };
}

export interface RuleUpgradeStatsForReview {
  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_rules_to_upgrade_total: number;

  /** Number of installed prebuilt rules available for upgrade which are stock (non-customized) */
  num_rules_to_upgrade_not_customized: number;

  /** Number of installed prebuilt rules available for upgrade which are customized by the user */
  num_rules_to_upgrade_customized: number;

  /** A union of all tags of all rules available for upgrade */
  tags: RuleTagArray;

  /** A union of all fields "to be upgraded" across all the rules available for upgrade. An array of field names. */
  fields: string[];
}

export interface RuleUpgradeInfoForReview {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  rule: DiffableRule;
  diff: PartialRuleDiff;
}
