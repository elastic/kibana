/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';

import type {
  DiffableRule,
  DiffableCustomQueryFields,
  DiffableSavedQueryFields,
  DiffableEqlFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
} from '../api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_rule';
import type {
  RuleSchedule,
  SavedKqlQuery,
  RuleDataSource as DiffableRuleDataSource,
  RuleKqlQuery as DiffableRuleKqlQuery,
} from '../api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';
import type {
  RuleResponse,
  querySchema,
  savedQuerySchema,
  eqlSchema,
  threatMatchSchema,
  thresholdSchema,
  machineLearningSchema,
  newTermsSchema,
  SharedResponseProps,
  KqlQueryLanguage,
} from '../api/detection_engine/model/rule_schema/rule_schemas';
import type { RuleFilterArray } from '../api/detection_engine/model/rule_schema/common_attributes';
import { assertUnreachable } from '../utility_types';

type RuleResponseCustomQueryFields = t.TypeOf<typeof querySchema.create>;
type RuleResponseSavedQueryFields = t.TypeOf<typeof savedQuerySchema.create>;
type RuleResponseEqlFields = t.TypeOf<typeof eqlSchema.create>;
type RuleResponseThreatMatchFields = t.TypeOf<typeof threatMatchSchema.create>;
type RuleResponseThresholdFields = t.TypeOf<typeof thresholdSchema.create>;
type RuleResponseMachineLearningFields = t.TypeOf<typeof machineLearningSchema.create>;
type RuleResponseNewTermsFields = t.TypeOf<typeof newTermsSchema.create>;

interface RuleResponseScheduleFields {
  from: string;
  to: string;
  interval: string;
}

const extractRuleSchedule = (ruleSchedule: RuleSchedule): RuleResponseScheduleFields => {
  const { interval, lookback } = ruleSchedule;
  const lookbackSeconds = Math.floor(parseDuration(lookback) / 1000);
  const intervalSeconds = Math.floor(parseDuration(interval) / 1000);
  const totalSeconds = lookbackSeconds + intervalSeconds;

  let totalDuration: string;
  if (totalSeconds % 3600 === 0) {
    totalDuration = `${totalSeconds / 3600}h`;
  } else if (totalSeconds % 60 === 0) {
    totalDuration = `${totalSeconds / 60}m`;
  } else {
    totalDuration = `${totalSeconds}s`;
  }

  const from = `now-${totalDuration}`;

  return {
    from,
    to: 'now',
    interval,
  };
};

type RuleResponseDataSource = { index: string[] } | { data_view_id: string };

const extractDataSource = (
  diffableRuleDataSource: DiffableRuleDataSource
): RuleResponseDataSource => {
  if (diffableRuleDataSource.type === 'index_patterns') {
    return { index: diffableRuleDataSource.index_patterns };
  } else if (diffableRuleDataSource.type === 'data_view') {
    return { data_view_id: diffableRuleDataSource.data_view_id };
  }

  return assertUnreachable(diffableRuleDataSource);
};

type RuleResponseKqlQuery =
  | { query: string; language: KqlQueryLanguage; filters: RuleFilterArray }
  | { saved_id: string };

const extractKqlQuery = (diffableRuleKqlQuery: DiffableRuleKqlQuery): RuleResponseKqlQuery => {
  if (diffableRuleKqlQuery.type === 'inline_query') {
    return {
      query: diffableRuleKqlQuery.query,
      language: diffableRuleKqlQuery.language,
      filters: diffableRuleKqlQuery.filters,
    };
  }

  if (diffableRuleKqlQuery.type === 'saved_query') {
    return { saved_id: diffableRuleKqlQuery.saved_query_id };
  }

  return assertUnreachable(diffableRuleKqlQuery);
};

const extractCommonFields = (diffableRule: DiffableRule): Partial<SharedResponseProps> => {
  const { from, to, interval } = extractRuleSchedule(diffableRule.rule_schedule);

  const commonFields: Partial<SharedResponseProps> = {
    rule_id: diffableRule.rule_id,
    version: diffableRule.version,
    meta: diffableRule.meta,
    name: diffableRule.name,
    tags: diffableRule.tags,
    description: diffableRule.description,
    severity: diffableRule.severity,
    severity_mapping: diffableRule.severity_mapping,
    risk_score: diffableRule.risk_score,
    risk_score_mapping: diffableRule.risk_score_mapping,
    references: diffableRule.references,
    false_positives: diffableRule.false_positives,
    threat: diffableRule.threat,
    note: diffableRule.note,
    related_integrations: diffableRule.related_integrations,
    required_fields: diffableRule.required_fields,
    author: diffableRule.author,
    license: diffableRule.license,
    from,
    to,
    interval,
    actions: diffableRule.actions,
    throttle: diffableRule.throttle,
    exceptions_list: diffableRule.exceptions_list,
    max_signals: diffableRule.max_signals,
    setup: diffableRule.setup,
  };

  if (diffableRule.building_block?.type) {
    commonFields.building_block_type = diffableRule.building_block.type;
  }

  if (diffableRule.rule_name_override?.field_name) {
    commonFields.rule_name_override = diffableRule.rule_name_override.field_name;
  }

  if (diffableRule.timeline_template?.timeline_id) {
    commonFields.timeline_id = diffableRule.timeline_template.timeline_id;
  }

  if (diffableRule.timeline_template?.timeline_title) {
    commonFields.timeline_title = diffableRule.timeline_template.timeline_title;
  }

  if (diffableRule.timestamp_override?.field_name) {
    commonFields.timestamp_override = diffableRule.timestamp_override.field_name;
  }

  if (diffableRule.timestamp_override?.fallback_disabled) {
    commonFields.timestamp_override_fallback_disabled =
      diffableRule.timestamp_override.fallback_disabled;
  }

  return commonFields;
};

const extractCustomQueryFields = (
  diffableRule: DiffableCustomQueryFields
): RuleResponseCustomQueryFields => {
  const customQueryFields: RuleResponseCustomQueryFields = {
    type: diffableRule.type,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
    ...(diffableRule.kql_query ? extractKqlQuery(diffableRule.kql_query) : {}),
  };

  if (diffableRule.alert_suppression) {
    customQueryFields.alert_suppression = diffableRule.alert_suppression;
  }

  return customQueryFields;
};

const extractSavedQueryFields = (
  diffableRule: DiffableSavedQueryFields
): RuleResponseSavedQueryFields => {
  /* Typecasting to SavedKqlQuery because a "save_query" DiffableRule can only have "kql_query" of type SavedKqlQuery */
  const diffableRuleKqlQuery = diffableRule.kql_query as SavedKqlQuery;

  const savedQueryFields: RuleResponseSavedQueryFields = {
    type: diffableRule.type,
    saved_id: diffableRuleKqlQuery.saved_query_id,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
  };

  if (diffableRule.alert_suppression) {
    savedQueryFields.alert_suppression = diffableRule.alert_suppression;
  }

  return savedQueryFields;
};

const extractEqlFields = (diffableRule: DiffableEqlFields): RuleResponseEqlFields => {
  const eqlFields: RuleResponseEqlFields = {
    type: diffableRule.type,
    query: diffableRule.eql_query.query,
    language: diffableRule.eql_query.language,
    filters: diffableRule.eql_query.filters,
    event_category_override: diffableRule.event_category_override,
    timestamp_field: diffableRule.timestamp_field,
    tiebreaker_field: diffableRule.tiebreaker_field,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
  };

  return eqlFields;
};

const extractThreatMatchFields = (
  diffableRule: DiffableThreatMatchFields
): RuleResponseThreatMatchFields => {
  const threatMatchFields: RuleResponseThreatMatchFields = {
    type: diffableRule.type,
    query:
      '' /* Indicator match rules have a "query" equal to an empty string if saved query is used */,
    threat_query: diffableRule.threat_query.query ?? '',
    threat_language: diffableRule.threat_query.language ?? '',
    threat_filters: diffableRule.threat_query.filters ?? [],
    threat_index: diffableRule.threat_index,
    threat_mapping: diffableRule.threat_mapping,
    threat_indicator_path: diffableRule.threat_indicator_path,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
    ...(diffableRule.kql_query ? extractKqlQuery(diffableRule.kql_query) : {}),
  };

  if (diffableRule.concurrent_searches) {
    threatMatchFields.concurrent_searches = diffableRule.concurrent_searches;
  }

  if (diffableRule.items_per_search) {
    threatMatchFields.items_per_search = diffableRule.items_per_search;
  }

  return threatMatchFields;
};

const extractThresholdFields = (
  diffableRule: DiffableThresholdFields
): RuleResponseThresholdFields => {
  const thresholdFields: RuleResponseThresholdFields = {
    type: diffableRule.type,
    query: '' /* Threshold rules have a "query" equal to an empty string if saved query is used */,
    threshold: diffableRule.threshold,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
    ...(diffableRule.kql_query ? extractKqlQuery(diffableRule.kql_query) : {}),
  };

  return thresholdFields;
};

const extractMachineLearningFields = (
  diffableRule: DiffableMachineLearningFields
): RuleResponseMachineLearningFields => {
  const machineLearningFields: RuleResponseMachineLearningFields = {
    type: diffableRule.type,
    machine_learning_job_id: diffableRule.machine_learning_job_id,
    anomaly_threshold: diffableRule.anomaly_threshold,
  };

  return machineLearningFields;
};

const extractNewTermsFields = (
  diffableRule: DiffableNewTermsFields
): RuleResponseNewTermsFields => {
  const newTermsFields: RuleResponseNewTermsFields = {
    type: diffableRule.type,
    query: diffableRule.kql_query.query,
    language: diffableRule.kql_query.language,
    filters: diffableRule.kql_query.filters,
    new_terms_fields: diffableRule.new_terms_fields,
    history_window_start: diffableRule.history_window_start,
    ...(diffableRule.data_source ? extractDataSource(diffableRule.data_source) : {}),
  };

  return newTermsFields;
};

/**
 * Converts a rule of type DiffableRule to a rule of type RuleResponse.
 * Note that DiffableRule doesn't include all the fields that RuleResponse has, so they will be missing from the returned object. These are meta fields like "enabled", "created_at", "created_by", "updated_at", "updated_by", "id", "immutable", "output_index", "revision"
 */
export const diffableRuleToRuleResponse = (diffableRule: DiffableRule): Partial<RuleResponse> => {
  const commonFields = extractCommonFields(diffableRule);

  if (diffableRule.type === 'query') {
    return {
      ...commonFields,
      ...extractCustomQueryFields(diffableRule),
    };
  }

  if (diffableRule.type === 'saved_query') {
    return {
      ...commonFields,
      ...extractSavedQueryFields(diffableRule),
    };
  }

  if (diffableRule.type === 'eql') {
    return {
      ...commonFields,
      ...extractEqlFields(diffableRule),
    };
  }

  if (diffableRule.type === 'threat_match') {
    return {
      ...commonFields,
      ...extractThreatMatchFields(diffableRule),
    };
  }

  if (diffableRule.type === 'threshold') {
    return {
      ...commonFields,
      ...extractThresholdFields(diffableRule),
    };
  }

  if (diffableRule.type === 'machine_learning') {
    return {
      ...commonFields,
      ...extractMachineLearningFields(diffableRule),
    };
  }

  if (diffableRule.type === 'new_terms') {
    return {
      ...commonFields,
      ...extractNewTermsFields(diffableRule),
    };
  }

  return assertUnreachable(diffableRule);
};
