/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSignatureId, RuleTagArray } from '../../../../rule_schema';
import type { SemanticVersion } from '../../content_model/semantic_version';
import type { SemanticVersion } from '../../content_model/prebuilt_rule_stack_version';
import type { DiffableRule } from '../../diffable_rule_model/diffable_rule';

export interface ReviewRuleInstallationResponseBody {
  status_code: number;
  message: string;
  attributes: {
    /** Aggregated info about all rules available for installation */
    stats: RuleInstallationStatsForReview;
    /** Info about individual rules: one object per each rule available for installation */
    rules: RuleInstallationInfoForReview[];
  };
}

export interface RuleInstallationStatsForReview {
  /** Number of prebuilt rules available for installation */
  num_rules_to_install: number;
  /** A union of all tags of all rules available for installation */
  tags: RuleTagArray;
}

// Option 1: rule ids and versions + all fields from DiffableRule
// Option 2: rule ids and versions + selected fields from DiffableRule (depending on the rule type)
export type RuleInstallationInfoForReview = DiffableRule & {
  rule_id: RuleSignatureId;
  rule_content_version: SemanticVersion;
  stack_version_min: SemanticVersion;
  stack_version_max: SemanticVersion;
};
