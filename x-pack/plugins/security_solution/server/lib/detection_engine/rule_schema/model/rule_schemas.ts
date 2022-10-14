/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  concurrentSearchesOrUndefined,
  itemsPerSearchOrUndefined,
  machine_learning_job_id_normalized,
  RiskScore,
  RiskScoreMapping,
  RuleActionArrayCamel,
  RuleActionThrottle,
  RuleIntervalFrom,
  RuleIntervalTo,
  Severity,
  SeverityMapping,
  threat_index,
  threat_mapping,
  threat_query,
  threatIndicatorPathOrUndefined,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  SIGNALS_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';

import type { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import {
  AlertsIndex,
  AlertsIndexNamespace,
  BuildingBlockType,
  DataViewId,
  EventCategoryOverride,
  ExceptionListArray,
  IndexPatternArray,
  InvestigationGuide,
  IsRuleEnabled,
  IsRuleImmutable,
  MaxSignals,
  RelatedIntegrationArray,
  RequiredFieldArray,
  RuleAuthorArray,
  RuleDescription,
  RuleFalsePositiveArray,
  RuleFilterArray,
  RuleLicense,
  RuleMetadata,
  RuleName,
  RuleNameOverride,
  RuleQuery,
  RuleReferenceArray,
  RuleSignatureId,
  RuleTagArray,
  RuleVersion,
  SetupGuide,
  ThreatArray,
  TiebreakerField,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampField,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from '../../../../../common/detection_engine/rule_schema';
import {
  savedIdOrUndefined,
  saved_id,
  thresholdNormalized,
  anomaly_threshold,
  newTermsFields,
  historyWindowStart,
} from '../../../../../common/detection_engine/schemas/common';
import { SERVER_APP_ID } from '../../../../../common/constants';
import { ResponseActionRuleParamsOrUndefined } from '../../../../../common/detection_engine/rule_response_actions/schemas';

const nonEqlLanguages = t.keyof({ kuery: null, lucene: null });

export const baseRuleParams = t.exact(
  t.type({
    author: RuleAuthorArray,
    buildingBlockType: t.union([BuildingBlockType, t.undefined]),
    description: RuleDescription,
    namespace: t.union([AlertsIndexNamespace, t.undefined]),
    note: t.union([InvestigationGuide, t.undefined]),
    falsePositives: RuleFalsePositiveArray,
    from: RuleIntervalFrom,
    ruleId: RuleSignatureId,
    immutable: IsRuleImmutable,
    license: t.union([RuleLicense, t.undefined]),
    outputIndex: AlertsIndex,
    timelineId: t.union([TimelineTemplateId, t.undefined]),
    timelineTitle: t.union([TimelineTemplateTitle, t.undefined]),
    meta: t.union([RuleMetadata, t.undefined]),
    // maxSignals not used in ML rules but probably should be used
    maxSignals: MaxSignals,
    riskScore: RiskScore,
    riskScoreMapping: RiskScoreMapping,
    ruleNameOverride: t.union([RuleNameOverride, t.undefined]),
    severity: Severity,
    severityMapping: SeverityMapping,
    timestampOverride: t.union([TimestampOverride, t.undefined]),
    timestampOverrideFallbackDisabled: t.union([TimestampOverrideFallbackDisabled, t.undefined]),
    threat: ThreatArray,
    to: RuleIntervalTo,
    references: RuleReferenceArray,
    version: RuleVersion,
    exceptionsList: ExceptionListArray,
    relatedIntegrations: t.union([RelatedIntegrationArray, t.undefined]),
    requiredFields: t.union([RequiredFieldArray, t.undefined]),
    setup: t.union([SetupGuide, t.undefined]),
  })
);
export type BaseRuleParams = t.TypeOf<typeof baseRuleParams>;

const eqlSpecificRuleParams = t.type({
  type: t.literal('eql'),
  language: t.literal('eql'),
  index: t.union([IndexPatternArray, t.undefined]),
  dataViewId: t.union([DataViewId, t.undefined]),
  query: RuleQuery,
  filters: t.union([RuleFilterArray, t.undefined]),
  eventCategoryOverride: t.union([EventCategoryOverride, t.undefined]),
  timestampField: t.union([TimestampField, t.undefined]),
  tiebreakerField: t.union([TiebreakerField, t.undefined]),
});
export const eqlRuleParams = t.intersection([baseRuleParams, eqlSpecificRuleParams]);
export type EqlSpecificRuleParams = t.TypeOf<typeof eqlSpecificRuleParams>;
export type EqlRuleParams = t.TypeOf<typeof eqlRuleParams>;

const threatSpecificRuleParams = t.type({
  type: t.literal('threat_match'),
  language: nonEqlLanguages,
  index: t.union([IndexPatternArray, t.undefined]),
  query: RuleQuery,
  filters: t.union([RuleFilterArray, t.undefined]),
  savedId: savedIdOrUndefined,
  threatFilters: t.union([RuleFilterArray, t.undefined]),
  threatQuery: threat_query,
  threatMapping: threat_mapping,
  threatLanguage: t.union([nonEqlLanguages, t.undefined]),
  threatIndex: threat_index,
  threatIndicatorPath: threatIndicatorPathOrUndefined,
  concurrentSearches: concurrentSearchesOrUndefined,
  itemsPerSearch: itemsPerSearchOrUndefined,
  dataViewId: t.union([DataViewId, t.undefined]),
});
export const threatRuleParams = t.intersection([baseRuleParams, threatSpecificRuleParams]);
export type ThreatSpecificRuleParams = t.TypeOf<typeof threatSpecificRuleParams>;
export type ThreatRuleParams = t.TypeOf<typeof threatRuleParams>;

const querySpecificRuleParams = t.exact(
  t.type({
    type: t.literal('query'),
    language: nonEqlLanguages,
    index: t.union([IndexPatternArray, t.undefined]),
    query: RuleQuery,
    filters: t.union([RuleFilterArray, t.undefined]),
    savedId: savedIdOrUndefined,
    dataViewId: t.union([DataViewId, t.undefined]),
    responseActions: ResponseActionRuleParamsOrUndefined,
  })
);
export const queryRuleParams = t.intersection([baseRuleParams, querySpecificRuleParams]);
export type QuerySpecificRuleParams = t.TypeOf<typeof querySpecificRuleParams>;
export type QueryRuleParams = t.TypeOf<typeof queryRuleParams>;

const savedQuerySpecificRuleParams = t.type({
  type: t.literal('saved_query'),
  // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
  // if the saved object gets deleted for some reason
  language: nonEqlLanguages,
  index: t.union([IndexPatternArray, t.undefined]),
  dataViewId: t.union([DataViewId, t.undefined]),
  query: t.union([RuleQuery, t.undefined]),
  filters: t.union([RuleFilterArray, t.undefined]),
  savedId: saved_id,
  responseActions: ResponseActionRuleParamsOrUndefined,
});
export const savedQueryRuleParams = t.intersection([baseRuleParams, savedQuerySpecificRuleParams]);
export type SavedQuerySpecificRuleParams = t.TypeOf<typeof savedQuerySpecificRuleParams>;
export type SavedQueryRuleParams = t.TypeOf<typeof savedQueryRuleParams>;

export const unifiedQueryRuleParams = t.intersection([
  baseRuleParams,
  t.union([querySpecificRuleParams, savedQuerySpecificRuleParams]),
]);
export type UnifiedQueryRuleParams = t.TypeOf<typeof unifiedQueryRuleParams>;

const thresholdSpecificRuleParams = t.type({
  type: t.literal('threshold'),
  language: nonEqlLanguages,
  index: t.union([IndexPatternArray, t.undefined]),
  query: RuleQuery,
  filters: t.union([RuleFilterArray, t.undefined]),
  savedId: savedIdOrUndefined,
  threshold: thresholdNormalized,
  dataViewId: t.union([DataViewId, t.undefined]),
});
export const thresholdRuleParams = t.intersection([baseRuleParams, thresholdSpecificRuleParams]);
export type ThresholdSpecificRuleParams = t.TypeOf<typeof thresholdSpecificRuleParams>;
export type ThresholdRuleParams = t.TypeOf<typeof thresholdRuleParams>;

const machineLearningSpecificRuleParams = t.type({
  type: t.literal('machine_learning'),
  anomalyThreshold: anomaly_threshold,
  machineLearningJobId: machine_learning_job_id_normalized,
});
export const machineLearningRuleParams = t.intersection([
  baseRuleParams,
  machineLearningSpecificRuleParams,
]);
export type MachineLearningSpecificRuleParams = t.TypeOf<typeof machineLearningSpecificRuleParams>;
export type MachineLearningRuleParams = t.TypeOf<typeof machineLearningRuleParams>;

const newTermsSpecificRuleParams = t.type({
  type: t.literal('new_terms'),
  query: RuleQuery,
  newTermsFields,
  historyWindowStart,
  index: t.union([IndexPatternArray, t.undefined]),
  filters: t.union([RuleFilterArray, t.undefined]),
  language: nonEqlLanguages,
  dataViewId: t.union([DataViewId, t.undefined]),
});
export const newTermsRuleParams = t.intersection([baseRuleParams, newTermsSpecificRuleParams]);
export type NewTermsSpecificRuleParams = t.TypeOf<typeof newTermsSpecificRuleParams>;
export type NewTermsRuleParams = t.TypeOf<typeof newTermsRuleParams>;

export const typeSpecificRuleParams = t.union([
  eqlSpecificRuleParams,
  threatSpecificRuleParams,
  querySpecificRuleParams,
  savedQuerySpecificRuleParams,
  thresholdSpecificRuleParams,
  machineLearningSpecificRuleParams,
  newTermsSpecificRuleParams,
]);
export type TypeSpecificRuleParams = t.TypeOf<typeof typeSpecificRuleParams>;

export const ruleParams = t.intersection([baseRuleParams, typeSpecificRuleParams]);
export type RuleParams = t.TypeOf<typeof ruleParams>;

export interface CompleteRule<T extends RuleParams> {
  alertId: string;
  ruleParams: T;
  ruleConfig: SanitizedRuleConfig;
}

export const notifyWhen = t.union([
  t.literal('onActionGroupChange'),
  t.literal('onActiveAlert'),
  t.literal('onThrottleInterval'),
  t.null,
]);

export const allRuleTypes = t.union([
  t.literal(SIGNALS_ID),
  t.literal(EQL_RULE_TYPE_ID),
  t.literal(INDICATOR_RULE_TYPE_ID),
  t.literal(ML_RULE_TYPE_ID),
  t.literal(QUERY_RULE_TYPE_ID),
  t.literal(SAVED_QUERY_RULE_TYPE_ID),
  t.literal(THRESHOLD_RULE_TYPE_ID),
  t.literal(NEW_TERMS_RULE_TYPE_ID),
]);

export const internalRuleCreate = t.type({
  name: RuleName,
  tags: RuleTagArray,
  alertTypeId: allRuleTypes,
  consumer: t.literal(SERVER_APP_ID),
  schedule: t.type({
    interval: t.string,
  }),
  enabled: IsRuleEnabled,
  actions: RuleActionArrayCamel,
  params: ruleParams,
  throttle: t.union([RuleActionThrottle, t.null]),
  notifyWhen,
});
export type InternalRuleCreate = t.TypeOf<typeof internalRuleCreate>;

export const internalRuleUpdate = t.type({
  name: RuleName,
  tags: RuleTagArray,
  schedule: t.type({
    interval: t.string,
  }),
  actions: RuleActionArrayCamel,
  params: ruleParams,
  throttle: t.union([RuleActionThrottle, t.null]),
  notifyWhen,
});
export type InternalRuleUpdate = t.TypeOf<typeof internalRuleUpdate>;
