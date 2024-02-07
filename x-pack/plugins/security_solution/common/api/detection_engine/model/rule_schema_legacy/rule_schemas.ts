/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  concurrent_searches,
  items_per_search,
  machine_learning_job_id,
  RiskScore,
  RiskScoreMapping,
  RuleActionArray,
  RuleActionThrottle,
  RuleInterval,
  RuleIntervalFrom,
  RuleIntervalTo,
  Severity,
  SeverityMapping,
  threat_filters,
  threat_index,
  threat_indicator_path,
  threat_mapping,
  threat_query,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import { ResponseActionArray } from './response_actions';

import { anomaly_threshold, saved_id } from '../schemas';

import {
  AlertsIndex,
  AlertsIndexNamespace,
  BuildingBlockType,
  DataViewId,
  ExceptionListArray,
  IndexPatternArray,
  InvestigationFields,
  InvestigationGuide,
  IsRuleEnabled,
  MaxSignals,
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
  SavedObjectResolveAliasPurpose,
  SavedObjectResolveAliasTargetId,
  SavedObjectResolveOutcome,
  ThreatArray,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from './common_attributes';
import { EventCategoryOverride, TiebreakerField, TimestampField } from './eql_attributes';
import { HistoryWindowStart, NewTermsFields } from './new_terms_attributes';
import { AlertSuppression } from './query_attributes';
import { Threshold } from './threshold_attributes';

export const buildRuleSchemas = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>({
  required,
  optional,
  defaultable,
}: {
  required: Required;
  optional: Optional;
  defaultable: Defaultable;
}) => ({
  create: t.intersection([
    t.exact(t.type(required)),
    t.exact(t.partial(optional)),
    t.exact(t.partial(defaultable)),
  ]),
  patch: t.intersection([t.partial(required), t.partial(optional), t.partial(defaultable)]),
  response: t.intersection([
    t.exact(t.type(required)),
    // This bit of logic is to force all fields to be accounted for in conversions from the internal
    // rule schema to the response schema. Rather than use `t.partial`, which makes each field optional,
    // we make each field required but possibly undefined. The result is that if a field is forgotten in
    // the conversion from internal schema to response schema TS will report an error. If we just used t.partial
    // instead, then optional fields can be accidentally omitted from the conversion - and any actual values
    // in those fields internally will be stripped in the response.
    t.exact(t.type(orUndefined(optional))),
    t.exact(t.type(defaultable)),
  ]),
});

export type OrUndefined<P extends t.Props> = {
  [K in keyof P]: P[K] | t.UndefinedC;
};

export const orUndefined = <P extends t.Props>(props: P): OrUndefined<P> => {
  return Object.keys(props).reduce<t.Props>((acc, key) => {
    acc[key] = t.union([props[key], t.undefined]);
    return acc;
  }, {}) as OrUndefined<P>;
};

// -------------------------------------------------------------------------------------------------
// Base schema

export const baseSchema = buildRuleSchemas({
  required: {
    name: RuleName,
    description: RuleDescription,
    risk_score: RiskScore,
    severity: Severity,
  },
  optional: {
    // Field overrides
    rule_name_override: RuleNameOverride,
    timestamp_override: TimestampOverride,
    timestamp_override_fallback_disabled: TimestampOverrideFallbackDisabled,
    // Timeline template
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
    // Attributes related to SavedObjectsClient.resolve API
    outcome: SavedObjectResolveOutcome,
    alias_target_id: SavedObjectResolveAliasTargetId,
    alias_purpose: SavedObjectResolveAliasPurpose,
    // Misc attributes
    license: RuleLicense,
    note: InvestigationGuide,
    building_block_type: BuildingBlockType,
    output_index: AlertsIndex,
    namespace: AlertsIndexNamespace,
    meta: RuleMetadata,
    investigation_fields: InvestigationFields,
    // Throttle
    throttle: RuleActionThrottle,
  },
  defaultable: {
    // Main attributes
    version: RuleVersion,
    tags: RuleTagArray,
    enabled: IsRuleEnabled,
    // Field overrides
    risk_score_mapping: RiskScoreMapping,
    severity_mapping: SeverityMapping,
    // Rule schedule
    interval: RuleInterval,
    from: RuleIntervalFrom,
    to: RuleIntervalTo,
    // Rule actions
    actions: RuleActionArray,
    // Rule exceptions
    exceptions_list: ExceptionListArray,
    // Misc attributes
    author: RuleAuthorArray,
    false_positives: RuleFalsePositiveArray,
    references: RuleReferenceArray,
    // maxSignals not used in ML rules but probably should be used
    max_signals: MaxSignals,
    threat: ThreatArray,
  },
});

export type DurationMetric = t.TypeOf<typeof DurationMetric>;
export const DurationMetric = PositiveInteger;

export type RuleExecutionMetrics = t.TypeOf<typeof RuleExecutionMetrics>;

/**
  @property total_search_duration_ms - "total time spent performing ES searches as measured by Kibana; 
  includes network latency and time spent serializing/deserializing request/response",
  @property total_indexing_duration_ms - "total time spent indexing documents during current rule execution cycle",
  @property total_enrichment_duration_ms - total time spent enriching documents during current rule execution cycle
  @property execution_gap_duration_s - "duration in seconds of execution gap"
*/
export const RuleExecutionMetrics = t.partial({
  total_search_duration_ms: DurationMetric,
  total_indexing_duration_ms: DurationMetric,
  total_enrichment_duration_ms: DurationMetric,
  execution_gap_duration_s: DurationMetric,
});

export type BaseCreateProps = t.TypeOf<typeof BaseCreateProps>;
export const BaseCreateProps = baseSchema.create;

// -------------------------------------------------------------------------------------------------
// Shared schemas

// "Shared" types are the same across all rule types, and built from "baseSchema" above
// with some variations for each route. These intersect with type specific schemas below
// to create the full schema for each route.

export type SharedCreateProps = t.TypeOf<typeof SharedCreateProps>;
export const SharedCreateProps = t.intersection([
  baseSchema.create,
  t.exact(t.partial({ rule_id: RuleSignatureId })),
]);

// -------------------------------------------------------------------------------------------------
// EQL rule schema

export type KqlQueryLanguage = t.TypeOf<typeof KqlQueryLanguage>;
export const KqlQueryLanguage = t.keyof({ kuery: null, lucene: null });

export type EqlQueryLanguage = t.TypeOf<typeof EqlQueryLanguage>;
export const EqlQueryLanguage = t.literal('eql');

const eqlSchema = buildRuleSchemas({
  required: {
    type: t.literal('eql'),
    language: EqlQueryLanguage,
    query: RuleQuery,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    timestamp_field: TimestampField,
    event_category_override: EventCategoryOverride,
    tiebreaker_field: TiebreakerField,
  },
  defaultable: {},
});

// -------------------------------------------------------------------------------------------------
// ES|QL rule schema

export type EsqlQueryLanguage = t.TypeOf<typeof EsqlQueryLanguage>;
export const EsqlQueryLanguage = t.literal('esql');

const esqlSchema = buildRuleSchemas({
  required: {
    type: t.literal('esql'),
    language: EsqlQueryLanguage,
    query: RuleQuery,
  },
  optional: {},
  defaultable: {},
});

// -------------------------------------------------------------------------------------------------
// Indicator Match rule schema

const threatMatchSchema = buildRuleSchemas({
  required: {
    type: t.literal('threat_match'),
    query: RuleQuery,
    threat_query,
    threat_mapping,
    threat_index,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    saved_id,
    threat_filters,
    threat_indicator_path,
    threat_language: KqlQueryLanguage,
    concurrent_searches,
    items_per_search,
  },
  defaultable: {
    language: KqlQueryLanguage,
  },
});

// -------------------------------------------------------------------------------------------------
// Custom Query rule schema

const querySchema = buildRuleSchemas({
  required: {
    type: t.literal('query'),
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    saved_id,
    response_actions: ResponseActionArray,
    alert_suppression: AlertSuppression,
  },
  defaultable: {
    query: RuleQuery,
    language: KqlQueryLanguage,
  },
});

// -------------------------------------------------------------------------------------------------
// Saved Query rule schema

const savedQuerySchema = buildRuleSchemas({
  required: {
    type: t.literal('saved_query'),
    saved_id,
  },
  optional: {
    // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
    // if the saved object gets deleted for some reason
    index: IndexPatternArray,
    data_view_id: DataViewId,
    query: RuleQuery,
    filters: RuleFilterArray,
    response_actions: ResponseActionArray,
    alert_suppression: AlertSuppression,
  },
  defaultable: {
    language: KqlQueryLanguage,
  },
});

// -------------------------------------------------------------------------------------------------
// Threshold rule schema

const thresholdSchema = buildRuleSchemas({
  required: {
    type: t.literal('threshold'),
    query: RuleQuery,
    threshold: Threshold,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    saved_id,
  },
  defaultable: {
    language: KqlQueryLanguage,
  },
});

// -------------------------------------------------------------------------------------------------
// Machine Learning rule schema

const machineLearningSchema = buildRuleSchemas({
  required: {
    type: t.literal('machine_learning'),
    anomaly_threshold,
    machine_learning_job_id,
  },
  optional: {},
  defaultable: {},
});

// -------------------------------------------------------------------------------------------------
// New Terms rule schema

const newTermsSchema = buildRuleSchemas({
  required: {
    type: t.literal('new_terms'),
    query: RuleQuery,
    new_terms_fields: NewTermsFields,
    history_window_start: HistoryWindowStart,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
  },
  defaultable: {
    language: KqlQueryLanguage,
  },
});

// -------------------------------------------------------------------------------------------------
// Combined type specific schemas

export type TypeSpecificCreateProps = t.TypeOf<typeof TypeSpecificCreateProps>;
export const TypeSpecificCreateProps = t.union([
  eqlSchema.create,
  esqlSchema.create,
  threatMatchSchema.create,
  querySchema.create,
  savedQuerySchema.create,
  thresholdSchema.create,
  machineLearningSchema.create,
  newTermsSchema.create,
]);
