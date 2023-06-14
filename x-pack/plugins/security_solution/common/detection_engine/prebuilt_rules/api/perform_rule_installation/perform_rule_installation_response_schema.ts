/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../rule_schema/model/rule_schemas';
import type { AggregatedPrebuiltRuleError } from '../../model/prebuilt_rules/aggregated_prebuilt_rules_error';

export enum SkipRuleInstallReason {
  ALREADY_INSTALLED = 'ALREADY_INSTALLED',
}

export interface SkippedRuleInstall {
  rule_id: string;
  reason: SkipRuleInstallReason;
}

export interface PerformRuleInstallationResponseBody {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
  results: {
    created: RuleResponse[];
    skipped: SkippedRuleInstall[];
  };
  errors: AggregatedPrebuiltRuleError[];
}
