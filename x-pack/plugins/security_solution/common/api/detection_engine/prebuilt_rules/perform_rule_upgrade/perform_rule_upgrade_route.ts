/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { mapValues } from 'lodash';
import { RuleResponse } from '../../model/rule_schema/rule_schemas.gen';
import { AggregatedPrebuiltRuleError, DiffableAllFields } from '../model';
import { RuleSignatureId, RuleVersion } from '../../model';

export type Mode = z.infer<typeof Mode>;
export const Mode = z.enum(['ALL_RULES', 'SPECIFIC_RULES']);
export type ModeEnum = typeof Mode.enum;
export const ModeEnum = Mode.enum;

export type PickVersionValues = z.infer<typeof PickVersionValues>;
export const PickVersionValues = z.enum(['BASE', 'CURRENT', 'TARGET', 'MERGED']);
export type PickVersionValuesEnum = typeof PickVersionValues.enum;
export const PickVersionValuesEnum = PickVersionValues.enum;

// Specific handling of special fields according to:
// https://github.com/elastic/kibana/issues/186544
export const FIELDS_TO_UPGRADE_TO_CURRENT_VERSION = [
  'enabled',
  'exceptions_list',
  'alert_suppression',
  'actions',
  'throttle',
  'response_actions',
  'meta',
  'output_index',
  'namespace',
  'alias_purpose',
  'alias_target_id',
  'outcome',
  'concurrent_searches',
  'items_per_search',
] as const;

export const FIELDS_TO_UPGRADE_TO_TARGET_VERSION = [
  'type',
  'rule_id',
  'version',
  'author',
  'license',
] as const;

// Fields which are part of DiffableRule but are not upgradeable
// and need to be omittted from the DiffableUpgradableFields
export const NON_UPGRADEABLE_DIFFABLE_FIELDS = ['type', 'rule_id', 'version'] as const;

type NON_UPGRADEABLE_DIFFABLE_FIELDS_TO_OMIT_TYPE = {
  readonly [key in (typeof NON_UPGRADEABLE_DIFFABLE_FIELDS)[number]]: true;
};

// This transformation is needed to have Zod's `omit` accept the rule fields that need to be omitted
export const DiffableFieldsToOmit = NON_UPGRADEABLE_DIFFABLE_FIELDS.reduce((acc, field) => {
  return { ...acc, [field]: true };
}, {} as NON_UPGRADEABLE_DIFFABLE_FIELDS_TO_OMIT_TYPE);

/**
 * Fields upgradable by the /upgrade/_perform endpoint.
 * Specific fields are omitted because they are not upgradeable, and
 * handled under the hood by endpoint logic.
 * See: https://github.com/elastic/kibana/issues/186544
 */
export type DiffableUpgradableFields = z.infer<typeof DiffableUpgradableFields>;
export const DiffableUpgradableFields = DiffableAllFields.omit(DiffableFieldsToOmit);

export type FieldUpgradeSpecifier<T> = z.infer<
  ReturnType<typeof fieldUpgradeSpecifier<z.ZodType<T>>>
>;
export const fieldUpgradeSpecifier = <T extends z.ZodTypeAny>(fieldSchema: T) =>
  z.discriminatedUnion('pick_version', [
    z
      .object({
        pick_version: PickVersionValues,
      })
      .strict(),
    z
      .object({
        pick_version: z.literal('RESOLVED'),
        resolved_value: fieldSchema,
      })
      .strict(),
  ]);

type FieldUpgradeSpecifiers<TFields> = {
  [Field in keyof TFields]?: FieldUpgradeSpecifier<TFields[Field]>;
};

export type RuleFieldsToUpgrade = FieldUpgradeSpecifiers<DiffableUpgradableFields>;
export const RuleFieldsToUpgrade = z
  .object(
    mapValues(DiffableUpgradableFields.shape, (fieldSchema) => {
      return fieldUpgradeSpecifier(fieldSchema).optional();
    })
  )
  .strict();

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
