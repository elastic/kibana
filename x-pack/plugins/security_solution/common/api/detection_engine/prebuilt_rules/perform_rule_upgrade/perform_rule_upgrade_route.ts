/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import {
  RuleSignatureId,
  RuleVersion,
  RuleName,
  RuleTagArray,
  RuleDescription,
  IsRuleEnabled,
  Severity,
  SeverityMapping,
  RiskScore,
  RiskScoreMapping,
  RuleReferenceArray,
  RuleFalsePositiveArray,
  ThreatArray,
  InvestigationGuide,
  SetupGuide,
  RelatedIntegrationArray,
  RequiredFieldArray,
  MaxSignals,
  BuildingBlockType,
  RuleIntervalFrom,
  RuleInterval,
  RuleExceptionList,
  RuleNameOverride,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
  TimelineTemplateId,
  TimelineTemplateTitle,
  IndexPatternArray,
  DataViewId,
  RuleQuery,
  QueryLanguage,
  RuleFilterArray,
  SavedQueryId,
  KqlQueryLanguage,
  InvestigationFields,
} from '../../model/rule_schema/common_attributes.gen';
import {
  MachineLearningJobId,
  AnomalyThreshold,
} from '../../model/rule_schema/specific_attributes/ml_attributes.gen';
import {
  ThreatQuery,
  ThreatMapping,
  ThreatIndex,
  ThreatFilters,
  ThreatIndicatorPath,
} from '../../model/rule_schema/specific_attributes/threat_match_attributes.gen';
import {
  NewTermsFields,
  HistoryWindowStart,
} from '../../model/rule_schema/specific_attributes/new_terms_attributes.gen';
import { RuleResponse } from '../../model/rule_schema/rule_schemas.gen';
import { AggregatedPrebuiltRuleError } from '../model';

export type PickVersionValues = z.infer<typeof PickVersionValues>;
export const PickVersionValues = z.enum(['BASE', 'CURRENT', 'TARGET', 'MERGED']);
export type PickVersionValuesEnum = typeof PickVersionValues.enum;
export const PickVersionValuesEnum = PickVersionValues.enum;

const createUpgradeFieldSchema = <T extends z.ZodType>(fieldSchema: T) =>
  z
    .discriminatedUnion('pick_version', [
      z.object({
        pick_version: PickVersionValues,
      }),
      z.object({
        pick_version: z.literal('RESOLVED'),
        resolved_value: fieldSchema,
      }),
    ])
    .optional();

export const RuleUpgradeSpecifierFields = z
  .object({
    name: createUpgradeFieldSchema(RuleName),
    tags: createUpgradeFieldSchema(RuleTagArray),
    description: createUpgradeFieldSchema(RuleDescription),
    severity: createUpgradeFieldSchema(Severity),
    severity_mapping: createUpgradeFieldSchema(SeverityMapping),
    enabled: createUpgradeFieldSchema(IsRuleEnabled),
    risk_score: createUpgradeFieldSchema(RiskScore),
    risk_score_mapping: createUpgradeFieldSchema(RiskScoreMapping),
    references: createUpgradeFieldSchema(RuleReferenceArray),
    false_positives: createUpgradeFieldSchema(RuleFalsePositiveArray),
    threat: createUpgradeFieldSchema(ThreatArray),
    note: createUpgradeFieldSchema(InvestigationGuide),
    setup: createUpgradeFieldSchema(SetupGuide),
    investigation_fields: createUpgradeFieldSchema(InvestigationFields),
    related_integrations: createUpgradeFieldSchema(RelatedIntegrationArray),
    required_fields: createUpgradeFieldSchema(RequiredFieldArray),
    max_signals: createUpgradeFieldSchema(MaxSignals),
    building_block_type: createUpgradeFieldSchema(BuildingBlockType),
    from: createUpgradeFieldSchema(RuleIntervalFrom),
    interval: createUpgradeFieldSchema(RuleInterval),
    exceptions_list: createUpgradeFieldSchema(RuleExceptionList),
    rule_name_override: createUpgradeFieldSchema(RuleNameOverride),
    timestamp_override: createUpgradeFieldSchema(TimestampOverride),
    timestamp_override_fallback_disabled: createUpgradeFieldSchema(
      TimestampOverrideFallbackDisabled
    ),
    timeline_id: createUpgradeFieldSchema(TimelineTemplateId),
    timeline_title: createUpgradeFieldSchema(TimelineTemplateTitle),
    index: createUpgradeFieldSchema(IndexPatternArray),
    data_view_id: createUpgradeFieldSchema(DataViewId),
    query: createUpgradeFieldSchema(RuleQuery),
    language: createUpgradeFieldSchema(QueryLanguage),
    filters: createUpgradeFieldSchema(RuleFilterArray),
    saved_id: createUpgradeFieldSchema(SavedQueryId),
    machine_learning_job_id: createUpgradeFieldSchema(MachineLearningJobId),
    anomaly_threshold: createUpgradeFieldSchema(AnomalyThreshold),
    threat_query: createUpgradeFieldSchema(ThreatQuery),
    threat_mapping: createUpgradeFieldSchema(ThreatMapping),
    threat_index: createUpgradeFieldSchema(ThreatIndex),
    threat_filters: createUpgradeFieldSchema(ThreatFilters),
    threat_indicator_path: createUpgradeFieldSchema(ThreatIndicatorPath),
    threat_language: createUpgradeFieldSchema(KqlQueryLanguage),
    new_terms_fields: createUpgradeFieldSchema(NewTermsFields),
    history_window_start: createUpgradeFieldSchema(HistoryWindowStart),
  });

  RuleUpgradeSpecifierFields.shape

export type RuleUpgradeSpecifier = z.infer<typeof RuleUpgradeSpecifier>;
export const RuleUpgradeSpecifier = z.object({
  rule_id: RuleSignatureId,
  revision: z.number(),
  version: RuleVersion,
  pick_version: PickVersionValues.optional(),
  // Fields that can be customized during the upgrade workflow
  // as decided in: https://github.com/elastic/kibana/issues/186544
  fields: RuleUpgradeSpecifierFields.optional()
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
