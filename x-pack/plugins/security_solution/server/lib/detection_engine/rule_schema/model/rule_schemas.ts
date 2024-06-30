/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import type {
  RuleActionArrayCamel,
  RuleActionNotifyWhen,
  RuleActionThrottle,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import * as z from 'zod';
import { RuleResponseAction } from '../../../../../common/api/detection_engine';
import type {
  IsRuleEnabled,
  RuleName,
  RuleTagArray,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import {
  AlertsIndex,
  AlertsIndexNamespace,
  AlertSuppressionCamel,
  AnomalyThreshold,
  BuildingBlockType,
  ConcurrentSearches,
  DataViewId,
  EventCategoryOverride,
  HistoryWindowStart,
  IndexPatternArray,
  InvestigationFields,
  InvestigationGuide,
  IsExternalRuleCustomized,
  IsRuleImmutable,
  ItemsPerSearch,
  KqlQueryLanguage,
  MaxSignals,
  NewTermsFields,
  RelatedIntegrationArray,
  RequiredFieldArray,
  RiskScore,
  RiskScoreMapping,
  RuleAuthorArray,
  RuleDescription,
  RuleExceptionList,
  RuleFalsePositiveArray,
  RuleFilterArray,
  RuleIntervalFrom,
  RuleIntervalTo,
  RuleLicense,
  RuleMetadata,
  RuleNameOverride,
  RuleQuery,
  RuleReferenceArray,
  RuleSignatureId,
  RuleVersion,
  SavedQueryId,
  SetupGuide,
  Severity,
  SeverityMapping,
  ThreatArray,
  ThreatIndex,
  ThreatIndicatorPath,
  ThreatMapping,
  ThreatQuery,
  ThresholdAlertSuppression,
  ThresholdNormalized,
  TiebreakerField,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampField,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type { SERVER_APP_ID } from '../../../../../common/constants';

// 8.10.x is mapped as an array of strings
export type LegacyInvestigationFields = z.infer<typeof LegacyInvestigationFields>;
export const LegacyInvestigationFields = z.array(z.string());

/*
 * In ESS 8.10.x "investigation_fields" are mapped as string[].
 * For 8.11+ logic is added on read in our endpoints to migrate
 * the data over to it's intended type of { field_names: string[] }.
 * The SO rule type will continue to support both types until we deprecate,
 * but APIs will only support intended object format.
 * See PR 169061
 */
export type InvestigationFieldsCombined = z.infer<typeof InvestigationFieldsCombined>;
export const InvestigationFieldsCombined = z.union([
  InvestigationFields,
  LegacyInvestigationFields,
]);

/**
 * This is the same type as RuleSource, but with the keys in camelCase. Intended
 * for internal use only (not for API responses).
 */
export type RuleSourceCamelCased = z.infer<typeof RuleSourceCamelCased>;
export const RuleSourceCamelCased = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('external'),
    isCustomized: IsExternalRuleCustomized,
  }),
  z.object({
    type: z.literal('internal'),
  }),
]);

// Conversion to an interface has to be disabled for the entire file; otherwise,
// the resulting union would not be assignable to Alerting's RuleParams due to a
// TypeScript bug: https://github.com/microsoft/TypeScript/issues/15300

export type BaseRuleParams = z.infer<typeof BaseRuleParams>;
export const BaseRuleParams = z.object({
  author: RuleAuthorArray,
  buildingBlockType: BuildingBlockType.optional(),
  description: RuleDescription,
  namespace: AlertsIndexNamespace.optional(),
  note: InvestigationGuide.optional(),
  falsePositives: RuleFalsePositiveArray,
  from: RuleIntervalFrom,
  ruleId: RuleSignatureId,
  investigationFields: InvestigationFieldsCombined.optional(),
  immutable: IsRuleImmutable,
  ruleSource: RuleSourceCamelCased.optional(),
  license: RuleLicense.optional(),
  outputIndex: AlertsIndex,
  timelineId: TimelineTemplateId.optional(),
  timelineTitle: TimelineTemplateTitle.optional(),
  meta: RuleMetadata.optional(),
  maxSignals: MaxSignals,
  riskScore: RiskScore,
  riskScoreMapping: RiskScoreMapping,
  ruleNameOverride: RuleNameOverride.optional(),
  severity: Severity,
  severityMapping: SeverityMapping,
  timestampOverride: TimestampOverride.optional(),
  timestampOverrideFallbackDisabled: TimestampOverrideFallbackDisabled.optional(),
  threat: ThreatArray,
  to: RuleIntervalTo,
  references: RuleReferenceArray,
  version: RuleVersion,
  exceptionsList: RuleExceptionList.array(),
  relatedIntegrations: RelatedIntegrationArray.optional(),
  requiredFields: RequiredFieldArray.optional(),
  setup: SetupGuide.optional(),
});

export type EqlSpecificRuleParams = z.infer<typeof EqlSpecificRuleParams>;
export const EqlSpecificRuleParams = z.object({
  type: z.literal('eql'),
  language: z.literal('eql'),
  index: IndexPatternArray.optional(),
  dataViewId: DataViewId.optional(),
  query: RuleQuery,
  filters: RuleFilterArray.optional(),
  eventCategoryOverride: EventCategoryOverride.optional(),
  timestampField: TimestampField.optional(),
  tiebreakerField: TiebreakerField.optional(),
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type EqlRuleParams = BaseRuleParams & EqlSpecificRuleParams;
export const EqlRuleParams = z.intersection(BaseRuleParams, EqlSpecificRuleParams);

export type EsqlSpecificRuleParams = z.infer<typeof EsqlSpecificRuleParams>;
export const EsqlSpecificRuleParams = z.object({
  type: z.literal('esql'),
  language: z.literal('esql'),
  query: RuleQuery,
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type EsqlRuleParams = BaseRuleParams & EsqlSpecificRuleParams;
export const EsqlRuleParams = z.intersection(BaseRuleParams, EsqlSpecificRuleParams);

export type ThreatSpecificRuleParams = z.infer<typeof ThreatSpecificRuleParams>;
export const ThreatSpecificRuleParams = z.object({
  type: z.literal('threat_match'),
  language: KqlQueryLanguage,
  index: IndexPatternArray.optional(),
  query: RuleQuery,
  filters: RuleFilterArray.optional(),
  savedId: SavedQueryId.optional(),
  threatFilters: RuleFilterArray.optional(),
  threatQuery: ThreatQuery,
  threatMapping: ThreatMapping,
  threatLanguage: KqlQueryLanguage.optional(),
  threatIndex: ThreatIndex,
  threatIndicatorPath: ThreatIndicatorPath.optional(),
  concurrentSearches: ConcurrentSearches.optional(),
  itemsPerSearch: ItemsPerSearch.optional(),
  dataViewId: DataViewId.optional(),
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type ThreatRuleParams = BaseRuleParams & ThreatSpecificRuleParams;
export const ThreatRuleParams = z.intersection(BaseRuleParams, ThreatSpecificRuleParams);

export type QuerySpecificRuleParams = z.infer<typeof QuerySpecificRuleParams>;
export const QuerySpecificRuleParams = z.object({
  type: z.literal('query'),
  language: KqlQueryLanguage,
  index: IndexPatternArray.optional(),
  query: RuleQuery,
  filters: RuleFilterArray.optional(),
  savedId: SavedQueryId.optional(),
  dataViewId: DataViewId.optional(),
  responseActions: z.array(RuleResponseAction).optional(),
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type QueryRuleParams = BaseRuleParams & QuerySpecificRuleParams;
export const QueryRuleParams = z.intersection(BaseRuleParams, QuerySpecificRuleParams);

export type SavedQuerySpecificRuleParams = z.infer<typeof SavedQuerySpecificRuleParams>;
export const SavedQuerySpecificRuleParams = z.object({
  type: z.literal('saved_query'),
  language: KqlQueryLanguage,
  index: IndexPatternArray.optional(),
  dataViewId: DataViewId.optional(),
  query: RuleQuery.optional(),
  filters: RuleFilterArray.optional(),
  savedId: SavedQueryId,
  responseActions: z.array(RuleResponseAction).optional(),
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type SavedQueryRuleParams = BaseRuleParams & SavedQuerySpecificRuleParams;
export const SavedQueryRuleParams = z.intersection(BaseRuleParams, SavedQuerySpecificRuleParams);

export type UnifiedQueryRuleParams = z.infer<typeof UnifiedQueryRuleParams>;
export const UnifiedQueryRuleParams = z.intersection(
  BaseRuleParams,
  z.union([QuerySpecificRuleParams, SavedQuerySpecificRuleParams])
);

export type ThresholdSpecificRuleParams = z.infer<typeof ThresholdSpecificRuleParams>;
export const ThresholdSpecificRuleParams = z.object({
  type: z.literal('threshold'),
  language: KqlQueryLanguage,
  index: IndexPatternArray.optional(),
  query: RuleQuery,
  filters: RuleFilterArray.optional(),
  savedId: SavedQueryId.optional(),
  threshold: ThresholdNormalized,
  dataViewId: DataViewId.optional(),
  alertSuppression: ThresholdAlertSuppression.optional(),
});

export type ThresholdRuleParams = BaseRuleParams & ThresholdSpecificRuleParams;
export const ThresholdRuleParams = z.intersection(BaseRuleParams, ThresholdSpecificRuleParams);

export type MachineLearningSpecificRuleParams = z.infer<typeof MachineLearningSpecificRuleParams>;
export const MachineLearningSpecificRuleParams = z.object({
  type: z.literal('machine_learning'),
  anomalyThreshold: AnomalyThreshold,
  machineLearningJobId: z.array(z.string()),
});

export type MachineLearningRuleParams = BaseRuleParams & MachineLearningSpecificRuleParams;
export const MachineLearningRuleParams = z.intersection(
  BaseRuleParams,
  MachineLearningSpecificRuleParams
);

export type NewTermsSpecificRuleParams = z.infer<typeof NewTermsSpecificRuleParams>;
export const NewTermsSpecificRuleParams = z.object({
  type: z.literal('new_terms'),
  query: RuleQuery,
  newTermsFields: NewTermsFields,
  historyWindowStart: HistoryWindowStart,
  index: IndexPatternArray.optional(),
  filters: RuleFilterArray.optional(),
  language: KqlQueryLanguage,
  dataViewId: DataViewId.optional(),
  alertSuppression: AlertSuppressionCamel.optional(),
});

export type NewTermsRuleParams = BaseRuleParams & NewTermsSpecificRuleParams;
export const NewTermsRuleParams = z.intersection(BaseRuleParams, NewTermsSpecificRuleParams);

export type TypeSpecificRuleParams = z.infer<typeof TypeSpecificRuleParams>;
export const TypeSpecificRuleParams = z.union([
  EqlSpecificRuleParams,
  EsqlSpecificRuleParams,
  ThreatSpecificRuleParams,
  QuerySpecificRuleParams,
  SavedQuerySpecificRuleParams,
  ThresholdSpecificRuleParams,
  MachineLearningSpecificRuleParams,
  NewTermsSpecificRuleParams,
]);

export type RuleParams = z.infer<typeof RuleParams>;
export const RuleParams = z.union([
  EqlRuleParams,
  EsqlRuleParams,
  ThreatRuleParams,
  QueryRuleParams,
  SavedQueryRuleParams,
  ThresholdRuleParams,
  MachineLearningRuleParams,
  NewTermsRuleParams,
]);

export interface CompleteRule<T extends RuleParams> {
  alertId: string;
  ruleParams: T;
  ruleConfig: SanitizedRuleConfig;
}

export type AllRuleTypes =
  | typeof SIGNALS_ID
  | typeof EQL_RULE_TYPE_ID
  | typeof ESQL_RULE_TYPE_ID
  | typeof INDICATOR_RULE_TYPE_ID
  | typeof ML_RULE_TYPE_ID
  | typeof QUERY_RULE_TYPE_ID
  | typeof SAVED_QUERY_RULE_TYPE_ID
  | typeof THRESHOLD_RULE_TYPE_ID
  | typeof NEW_TERMS_RULE_TYPE_ID;

export interface InternalRuleCreate {
  name: RuleName;
  tags: RuleTagArray;
  alertTypeId: AllRuleTypes;
  consumer: typeof SERVER_APP_ID;
  schedule: {
    interval: string;
  };
  enabled: IsRuleEnabled;
  actions: RuleActionArrayCamel;
  params: RuleParams;
  throttle?: RuleActionThrottle | null;
  notifyWhen?: RuleActionNotifyWhen | null;
}

export interface InternalRuleUpdate {
  name: RuleName;
  tags: RuleTagArray;
  schedule: {
    interval: string;
  };
  actions: RuleActionArrayCamel;
  params: RuleParams;
  throttle?: RuleActionThrottle | null;
  notifyWhen?: RuleActionNotifyWhen | null;
}
