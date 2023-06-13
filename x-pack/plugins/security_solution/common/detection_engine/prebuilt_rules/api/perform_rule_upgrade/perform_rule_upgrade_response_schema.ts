/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../rule_schema';
import type { AggregatedPrebuiltRuleError } from '../../model/prebuilt_rules/aggregated_prebuilt_rules_error';

export enum SkipRuleUpgradeReason {
  RULE_UP_TO_DATE = 'RULE_UP_TO_DATE',
}

export interface SkippedRuleUpgrade {
  rule_id: string;
  reason: SkipRuleUpgradeReason;
}

export interface PerformRuleUpgradeResponseBody {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
  results: {
    updated: RuleResponse[];
    skipped: SkippedRuleUpgrade[];
  };
  errors: AggregatedPrebuiltRuleError[];
}
