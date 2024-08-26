/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { RuleResponse } from '../../model/rule_schema/rule_schemas.gen';
import { AggregatedPrebuiltRuleError, PickVersionValues, RuleFieldsToUpgrade } from '../model';
import { RuleSignatureId, RuleVersion } from '../../model';

export type RuleUpgradeSpecifier = z.infer<typeof RuleUpgradeSpecifier>;
export const RuleUpgradeSpecifier = z.object({
  rule_id: RuleSignatureId,
  revision: z.number(),
  version: RuleVersion,
  pick_version: PickVersionValues.optional(),
  // Fields that can be customized during the upgrade workflow
  // as decided in: https://github.com/elastic/kibana/issues/186544
  fields: RuleFieldsToUpgrade.optional(),
});

export type UpgradeSpecificRulesRequest = z.infer<typeof UpgradeSpecificRulesRequest>;
export const UpgradeSpecificRulesRequest = z.object({
  mode: z.literal('SPECIFIC_RULES'),
  rules: z.array(RuleUpgradeSpecifier),
  pick_version: PickVersionValues.optional(),
});

export type UpgradeAllRulesRequest = z.infer<typeof UpgradeAllRulesRequest>;
export const UpgradeAllRulesRequest = z.object({
  mode: z.literal('ALL_RULES'),
  pick_version: PickVersionValues.optional(),
});

export type SkipRuleUpgradeReason = z.infer<typeof SkipRuleUpgradeReason>;
export const SkipRuleUpgradeReason = z.enum(['RULE_UP_TO_DATE']);
export type SkipRuleUpgradeReasonEnum = typeof SkipRuleUpgradeReason.enum;
export const SkipRuleUpgradeReasonEnum = SkipRuleUpgradeReason.enum;

export type SkippedRuleUpgrade = z.infer<typeof SkippedRuleUpgrade>;
export const SkippedRuleUpgrade = z.object({
  rule_id: z.string(),
  reason: SkipRuleUpgradeReason,
});

export type PerformRuleUpgradeResponseBody = z.infer<typeof PerformRuleUpgradeResponseBody>;
export const PerformRuleUpgradeResponseBody = z.object({
  summary: z.object({
    total: z.number(),
    succeeded: z.number(),
    skipped: z.number(),
    failed: z.number(),
  }),
  results: z.object({
    updated: z.array(RuleResponse),
    skipped: z.array(SkippedRuleUpgrade),
  }),
  errors: z.array(AggregatedPrebuiltRuleError),
});

export type PerformRuleUpgradeRequestBody = z.infer<typeof PerformRuleUpgradeRequestBody>;
export const PerformRuleUpgradeRequestBody = z.discriminatedUnion('mode', [
  UpgradeAllRulesRequest,
  UpgradeSpecificRulesRequest,
]);
