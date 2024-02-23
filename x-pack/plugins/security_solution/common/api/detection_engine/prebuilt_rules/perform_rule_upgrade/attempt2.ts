/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResponse } from '../../model';
import { AggregatedPrebuiltRuleError } from '../model';

enum PickVersionValues {
  BASE = 'BASE',
  CURRENT = 'CURRENT',
  TARGET = 'TARGET',
}

interface RuleUpgradeSpecifier {
  rule_id: string;
  revision: number;
  version: number;
  pick_version?: PickVersionValues;
}

interface UpgradeSpecificRulesRequest {
  mode: 'SPECIFIC_RULES';
  rules: RuleUpgradeSpecifier[];
  pick_version?: PickVersionValues;
}

interface UpgradeAllRulesRequest {
  mode: 'ALL_RULES';
  pick_version?: PickVersionValues;
}

type PerformRuleUpgradeRequestBody = UpgradeAllRulesRequest | UpgradeSpecificRulesRequest;

enum SkipRuleUpgradeReason {
  RULE_UP_TO_DATE = 'RULE_UP_TO_DATE',
}
