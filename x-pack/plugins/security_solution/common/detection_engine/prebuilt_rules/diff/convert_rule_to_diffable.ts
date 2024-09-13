/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredOptional } from '@kbn/zod-helpers';
import { requiredOptional } from '@kbn/zod-helpers';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { assertUnreachable } from '../../../utility_types';
import type {
  EqlRule,
  EqlRuleCreateProps,
  EsqlRule,
  EsqlRuleCreateProps,
  MachineLearningRule,
  MachineLearningRuleCreateProps,
  NewTermsRule,
  NewTermsRuleCreateProps,
  QueryRule,
  QueryRuleCreateProps,
  SavedQueryRule,
  SavedQueryRuleCreateProps,
  ThreatMatchRule,
  ThreatMatchRuleCreateProps,
  ThresholdRule,
  ThresholdRuleCreateProps,
} from '../../../api/detection_engine/model/rule_schema';
import type {
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableRule,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
} from '../../../api/detection_engine/prebuilt_rules';
import { addEcsToRequiredFields } from '../../rule_management/utils';
import type { DiffableRuleInput } from './types';
import { extractBuildingBlockObject } from './extract_building_block_object';
import {
  extractInlineKqlQuery,
  extractRuleEqlQuery,
  extractRuleEsqlQuery,
  extractRuleKqlQuery,
} from './extract_rule_data_query';
import { extractRuleDataSource } from './extract_rule_data_source';
import { extractRuleNameOverrideObject } from './extract_rule_name_override_object';
import { extractRuleSchedule } from './extract_rule_schedule';
import { extractTimelineTemplateReference } from './extract_timeline_template_reference';
import { extractTimestampOverrideObject } from './extract_timestamp_override_object';

/**
 * Normalizes a given rule to the form which is suitable for passing to the diff algorithm.
 * Read more in the JSDoc description of DiffableRule.
 */
export const convertRuleToDiffable = (rule: DiffableRuleInput): DiffableRule => {
  const commonFields = extractDiffableCommonFields(rule);

  switch (rule.type) {
    case 'query':
      return {
        ...commonFields,
        ...extractDiffableCustomQueryFields(rule),
      };
    case 'saved_query':
      return {
        ...commonFields,
        ...extractDiffableSavedQueryFieldsFromRuleObject(rule),
      };
    case 'eql':
      return {
        ...commonFields,
        ...extractDiffableEqlFieldsFromRuleObject(rule),
      };
    case 'threat_match':
      return {
        ...commonFields,
        ...extractDiffableThreatMatchFieldsFromRuleObject(rule),
      };
    case 'threshold':
      return {
        ...commonFields,
        ...extractDiffableThresholdFieldsFromRuleObject(rule),
      };
    case 'machine_learning':
      return {
        ...commonFields,
        ...extractDiffableMachineLearningFieldsFromRuleObject(rule),
      };
    case 'new_terms':
      return {
        ...commonFields,
        ...extractDiffableNewTermsFieldsFromRuleObject(rule),
      };
    case 'esql':
      return {
        ...commonFields,
        ...extractDiffableEsqlFieldsFromRuleObject(rule),
      };
    default:
      return assertUnreachable(rule, 'Unhandled rule type');
  }
};

const extractDiffableCommonFields = (
  rule: DiffableRuleInput
): RequiredOptional<DiffableCommonFields> => {
  return {
    // --------------------- REQUIRED FIELDS
    // Technical fields
    rule_id: rule.rule_id,
    version: rule.version,

    // Main domain fields
    name: rule.name,
    tags: rule.tags ?? [],
    description: rule.description,
    severity: rule.severity,
    severity_mapping: rule.severity_mapping ?? [],
    risk_score: rule.risk_score,
    risk_score_mapping: rule.risk_score_mapping?.map((mapping) => requiredOptional(mapping)) ?? [],

    // About -> Advanced settings
    references: rule.references ?? [],
    false_positives: rule.false_positives ?? [],
    threat: rule.threat ?? [],
    note: rule.note ?? '',
    setup: rule.setup ?? '',
    related_integrations: rule.related_integrations ?? [],
    required_fields: addEcsToRequiredFields(rule.required_fields),
    author: rule.author ?? [],
    license: rule.license ?? '',

    // Other domain fields
    rule_schedule: extractRuleSchedule(rule),
    exceptions_list: rule.exceptions_list ?? [],
    max_signals: rule.max_signals ?? DEFAULT_MAX_SIGNALS,

    // --------------------- OPTIONAL FIELDS
    investigation_fields: rule.investigation_fields,
    rule_name_override: extractRuleNameOverrideObject(rule),
    timestamp_override: extractTimestampOverrideObject(rule),
    timeline_template: extractTimelineTemplateReference(rule),
    building_block: extractBuildingBlockObject(rule),
  };
};

const extractDiffableCustomQueryFields = (
  rule: QueryRule | QueryRuleCreateProps
): RequiredOptional<DiffableCustomQueryFields> => {
  return {
    type: rule.type,
    kql_query: extractRuleKqlQuery(rule.query, rule.language, rule.filters, rule.saved_id),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableSavedQueryFieldsFromRuleObject = (
  rule: SavedQueryRule | SavedQueryRuleCreateProps
): RequiredOptional<DiffableSavedQueryFields> => {
  return {
    type: rule.type,
    kql_query: extractRuleKqlQuery(rule.query, rule.language, rule.filters, rule.saved_id),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableEqlFieldsFromRuleObject = (
  rule: EqlRule | EqlRuleCreateProps
): RequiredOptional<DiffableEqlFields> => {
  return {
    type: rule.type,
    eql_query: extractRuleEqlQuery(rule.query, rule.language, rule.filters),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    event_category_override: rule.event_category_override,
    timestamp_field: rule.timestamp_field,
    tiebreaker_field: rule.tiebreaker_field,
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableEsqlFieldsFromRuleObject = (
  rule: EsqlRule | EsqlRuleCreateProps
): RequiredOptional<DiffableEsqlFields> => {
  return {
    type: rule.type,
    esql_query: extractRuleEsqlQuery(rule.query, rule.language),
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableThreatMatchFieldsFromRuleObject = (
  rule: ThreatMatchRule | ThreatMatchRuleCreateProps
): RequiredOptional<DiffableThreatMatchFields> => {
  return {
    type: rule.type,
    kql_query: extractRuleKqlQuery(rule.query, rule.language, rule.filters, rule.saved_id),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    threat_query: extractInlineKqlQuery(
      rule.threat_query,
      rule.threat_language,
      rule.threat_filters
    ),
    threat_index: rule.threat_index,
    threat_mapping: rule.threat_mapping,
    threat_indicator_path: rule.threat_indicator_path,
    threat_language: rule.threat_language,
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableThresholdFieldsFromRuleObject = (
  rule: ThresholdRule | ThresholdRuleCreateProps
): RequiredOptional<DiffableThresholdFields> => {
  return {
    type: rule.type,
    kql_query: extractRuleKqlQuery(rule.query, rule.language, rule.filters, rule.saved_id),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    threshold: rule.threshold,
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableMachineLearningFieldsFromRuleObject = (
  rule: MachineLearningRule | MachineLearningRuleCreateProps
): RequiredOptional<DiffableMachineLearningFields> => {
  return {
    type: rule.type,
    machine_learning_job_id: rule.machine_learning_job_id,
    anomaly_threshold: rule.anomaly_threshold,
    alert_suppression: rule.alert_suppression,
  };
};

const extractDiffableNewTermsFieldsFromRuleObject = (
  rule: NewTermsRule | NewTermsRuleCreateProps
): RequiredOptional<DiffableNewTermsFields> => {
  return {
    type: rule.type,
    kql_query: extractInlineKqlQuery(rule.query, rule.language, rule.filters),
    data_source: extractRuleDataSource(rule.index, rule.data_view_id),
    new_terms_fields: rule.new_terms_fields,
    history_window_start: rule.history_window_start,
    alert_suppression: rule.alert_suppression,
  };
};
