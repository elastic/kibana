/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../model';
import type { AggregatedPrebuiltRuleError } from '../model';

export enum PickVersionValues {
  BASE = 'BASE',
  CURRENT = 'CURRENT',
  TARGET = 'TARGET',
}

export type TPickVersionValues = keyof typeof PickVersionValues;

export interface RuleUpgradeSpecifier {
  rule_id: string;
  /**
   * This parameter is needed for handling race conditions with Optimistic Concurrency Control.
   * Two or more users can call upgrade/_review and upgrade/_perform endpoints concurrently.
   * Also, in general, the time between these two calls can be anything.
   * The idea is to only allow the user to install a rule if the user has reviewed the exact version
   * of it that had been returned from the _review endpoint. If the version changed on the BE,
   * upgrade/_perform endpoint will return a version mismatch error for this rule.
   */
  revision: number;
  /**
   * The target version to upgrade to.
   */
  version: number;
  pick_version?: TPickVersionValues;
}

export interface UpgradeSpecificRulesRequest {
  mode: 'SPECIFIC_RULES';
  rules: RuleUpgradeSpecifier[];
  pick_version?: TPickVersionValues;
}

export interface UpgradeAllRulesRequest {
  mode: 'ALL_RULES';
  pick_version?: TPickVersionValues;
}

export type PerformRuleUpgradeRequestBody = UpgradeSpecificRulesRequest | UpgradeAllRulesRequest;

export enum SkipRuleUpgradeReason {
  RULE_UP_TO_DATE = 'RULE_UP_TO_DATE',
}
