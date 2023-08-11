/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';

import type { DiffableRule } from '../api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_rule';
import type { RuleSchedule } from '../api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';
import type { RuleResponse } from '../api/detection_engine/model/rule_schema/rule_schemas';

interface RuleResponseScheduleFields {
  from: string;
  to: string;
  interval: string;
}

const extractRuleScheduleFields = (ruleSchedule: RuleSchedule): RuleResponseScheduleFields => {
  const { interval, lookback } = ruleSchedule; // But can also be `Cannot parse: interval="${interval}"`. Should I default to smth?
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
    to: 'now', // TODO: When is it not `now`?
    interval,
  };
};

const extractCommonFields = (diffableRule: DiffableRule) => {
  const { from, to, interval } = extractRuleScheduleFields(diffableRule.rule_schedule);

  const commonFields = {
    // --------------------- REQUIRED FIELDS
    // Technical fields
    rule_id: diffableRule.rule_id,
    version: diffableRule.version,
    meta: diffableRule.meta,

    // Main domain fields
    name: diffableRule.name,
    tags: diffableRule.tags,
    description: diffableRule.description,
    severity: diffableRule.severity,
    severity_mapping: diffableRule.severity_mapping,
    risk_score: diffableRule.risk_score,
    risk_score_mapping: diffableRule.risk_score_mapping,

    // About -> Advanced settings
    references: diffableRule.references,
    false_positives: diffableRule.false_positives,
    threat: diffableRule.threat,
    note: diffableRule.note,
    related_integrations: diffableRule.related_integrations,
    required_fields: diffableRule.required_fields,
    author: diffableRule.author,
    license: diffableRule.license,

    // Other domain fields
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

const extractCustomQueryFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'query') {
    return {};
  }

  const customQueryFields = {
    type: diffableRule.type,
    query: diffableRule.kql_query.query ?? '',
    language: diffableRule.kql_query.language ?? '',
    filters: diffableRule.kql_query.filters ?? [],
  };

  if (diffableRule.data_source?.type === 'index_patterns') {
    customQueryFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    customQueryFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  if (diffableRule.alert_suppression) {
    customQueryFields.alert_suppression = diffableRule.alert_suppression;
  }

  return customQueryFields;
};

const extractSavedQueryFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'saved_query') {
    return {};
  }

  const savedQueryFields = {
    type: diffableRule.type,
    saved_id: diffableRule.kql_query.saved_query_id,
  };

  if (diffableRule.kql_query?.language) {
    // "lucene" language disappears when you run convertRuleToDiffable
    savedQueryFields.language = diffableRule.kql_query.language;
  }

  if (diffableRule.data_source?.type === 'index_patterns') {
    savedQueryFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    savedQueryFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  if (diffableRule.alert_suppression) {
    savedQueryFields.alert_suppression = diffableRule.alert_suppression;
  }

  return savedQueryFields;
};

const extractEqlFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'eql') {
    return {};
  }

  const eqlFields = {
    type: diffableRule.type,
    query: diffableRule.eql_query.query,
    language: diffableRule.eql_query.language,
    filters: diffableRule.eql_query.filters,
    event_category_override: diffableRule.event_category_override,
    timestamp_field: diffableRule.timestamp_field,
    tiebreaker_field: diffableRule.tiebreaker_field,
  };

  if (diffableRule.data_source?.type === 'index_patterns') {
    eqlFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    eqlFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  return eqlFields;
};

const extractThreatMatchFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'threat_match') {
    return {};
  }

  const threatMatchFields = {
    type: diffableRule.type,
    query: diffableRule.kql_query.query ?? '',
    language: diffableRule.kql_query.language ?? '',
    filters: diffableRule.kql_query.filters ?? [],
    threat_query: diffableRule.threat_query.query ?? '',
    threat_language: diffableRule.threat_query.language ?? '',
    threat_filters: diffableRule.threat_query.filters ?? [],
    threat_index: diffableRule.threat_index,
    threat_mapping: diffableRule.threat_mapping,
    threat_indicator_path: diffableRule.threat_indicator_path,
  };

  if (diffableRule.concurrent_searches) {
    threatMatchFields.concurrent_searches = diffableRule.concurrent_searches;
  }

  if (diffableRule.items_per_search) {
    threatMatchFields.items_per_search = diffableRule.items_per_search;
  }

  if (diffableRule.data_source?.type === 'index_patterns') {
    threatMatchFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    threatMatchFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  return threatMatchFields;
};

const extractThresholdFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'threshold') {
    return {};
  }

  const thresholdFields = {
    type: diffableRule.type,
    query: diffableRule.kql_query.query ?? '',
    filters: diffableRule.kql_query.filters ?? [],
    threshold: diffableRule.threshold,
  };

  if (diffableRule.kql_query?.language) {
    thresholdFields.language = diffableRule.kql_query.language; // Also "filters" gets removed when converting to DiffableRule
  }

  if (diffableRule.kql_query?.type === 'saved_query') {
    thresholdFields.saved_id = diffableRule.kql_query.saved_query_id;
  }

  if (diffableRule.data_source?.type === 'index_patterns') {
    thresholdFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    thresholdFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  return thresholdFields;
};

const extractMachineLearningFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'machine_learning') {
    return {};
  }

  const machineLearningFields = {
    type: diffableRule.type,
    machine_learning_job_id: diffableRule.machine_learning_job_id,
    anomaly_threshold: diffableRule.anomaly_threshold,
  };

  return machineLearningFields;
};

const extractNewTermsFields = (diffableRule: DiffableRule) => {
  if (diffableRule.type !== 'new_terms') {
    return {};
  }

  const newTermsFields = {
    type: diffableRule.type,
    query: diffableRule.kql_query.query ?? '',
    language: diffableRule.kql_query.language ?? '',
    filters: diffableRule.kql_query.filters ?? [],
    new_terms_fields: diffableRule.new_terms_fields,
    history_window_start: diffableRule.history_window_start,
  };

  if (diffableRule.data_source?.type === 'index_patterns') {
    newTermsFields.index = diffableRule.data_source.index_patterns;
  }

  if (diffableRule.data_source?.type === 'data_view') {
    newTermsFields.data_view_id = diffableRule.data_source.data_view_id;
  }

  return newTermsFields;
};

export const diffableRuleToRuleResponse = (diffableRule: DiffableRule): RuleResponse => {
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

  return {
    ...commonFields,
  };
};
