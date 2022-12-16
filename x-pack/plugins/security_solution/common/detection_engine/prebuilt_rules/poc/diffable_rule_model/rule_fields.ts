/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleToInstall } from '../../model/prebuilt_rule';
import type { RuleResponse } from '../../../rule_schema';

/* eslint-disable @typescript-eslint/naming-convention */

const fieldsOfPrebuiltRuleToInstall = () => {
  const rule = {} as unknown as PrebuiltRuleToInstall;

  // ---------------------------------------------------------------------------
  // Common fields
  const {
    // -------------------------------------------------------------------------
    // Required fields
    rule_id, // ✅
    version, // ✅
    // type, // ✅
    name, // ✅
    description, // ✅
    risk_score, // ✅
    severity, // ✅

    // -------------------------------------------------------------------------
    // Optional fields
    related_integrations, // ✅
    required_fields, // ✅
    setup, // ✅
    // Field overrides
    rule_name_override, // ✅
    timestamp_override, // ✅
    timestamp_override_fallback_disabled, // ✅
    // Timeline template
    timeline_id, // ✅
    timeline_title, // ✅
    // Attributes related to SavedObjectsClient.resolve API
    outcome, // ✅
    alias_target_id, // ✅
    alias_purpose, // ✅
    // Misc attributes
    license, // ✅
    note, // ✅
    building_block_type, // ✅
    output_index, // ✅
    namespace, // ✅
    meta, // ✅

    // -------------------------------------------------------------------------
    // Defaultable fields
    // Main attributes
    tags, // ✅
    enabled, // ✅
    // Field overrides
    risk_score_mapping, // ✅
    severity_mapping, // ✅
    // Rule schedule
    interval, // ✅
    from, // ✅
    to, // ✅
    // Rule actions
    actions, // ✅
    throttle, // ✅
    // Rule exceptions
    exceptions_list, // ✅
    // Misc attributes
    author, // ✅
    false_positives, // ✅
    references, // ✅
    // maxSignals not used in ML rules but probably should be used
    max_signals, // ✅
    threat, // ✅

    ...ruleWithoutAllCommonFields
  } = rule;

  // ---------------------------------------------------------------------------
  // Custom Query fields
  if (ruleWithoutAllCommonFields.type === 'query') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      response_actions, // ✅
      alert_suppression, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Saved Query fields
  if (ruleWithoutAllCommonFields.type === 'saved_query') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      response_actions, // ✅
      alert_suppression, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // EQL fields
  if (ruleWithoutAllCommonFields.type === 'eql') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      event_category_override, // ✅
      timestamp_field, // ✅
      tiebreaker_field, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Indicator Match fields
  if (ruleWithoutAllCommonFields.type === 'threat_match') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      threat_query, // ✅
      threat_mapping, // ✅
      threat_index, // ✅
      threat_filters, // ✅
      threat_indicator_path, // ✅
      threat_language, // ✅
      concurrent_searches, // ✅
      items_per_search, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Threshold fields
  if (ruleWithoutAllCommonFields.type === 'threshold') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      threshold, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Machine Learning fields
  if (ruleWithoutAllCommonFields.type === 'machine_learning') {
    const {
      type, // ✅
      machine_learning_job_id, // ✅
      anomaly_threshold, // ✅
      ...rest__________________________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // New Terms fields
  if (ruleWithoutAllCommonFields.type === 'new_terms') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      new_terms_fields, // ✅
      history_window_start, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }
};

const fieldsOfRuleResponse = () => {
  const rule = {} as unknown as RuleResponse;

  // ---------------------------------------------------------------------------
  // Common fields
  const {
    // -------------------------------------------------------------------------
    // Response required and optional fields
    id, // ✅
    rule_id, // ✅
    created_at, // ✅
    created_by, // ✅
    updated_at, // ✅
    updated_by, // ✅
    immutable, // ✅
    related_integrations, // ✅
    required_fields, // ✅
    setup, // ✅
    execution_summary, // ✅

    // -------------------------------------------------------------------------
    // Required fields
    // type, // ✅
    name, // ✅
    description, // ✅
    risk_score, // ✅
    severity, // ✅

    // -------------------------------------------------------------------------
    // Optional fields
    // Field overrides
    rule_name_override, // ✅
    timestamp_override, // ✅
    timestamp_override_fallback_disabled, // ✅
    // Timeline template
    timeline_id, // ✅
    timeline_title, // ✅
    // Attributes related to SavedObjectsClient.resolve API
    outcome, // ✅
    alias_target_id, // ✅
    alias_purpose, // ✅
    // Misc attributes
    license, // ✅
    note, // ✅
    building_block_type, // ✅
    output_index, // ✅
    namespace, // ✅
    meta, // ✅

    // -------------------------------------------------------------------------
    // Defaultable fields
    // Main attributes
    version, // ✅
    tags, // ✅
    enabled, // ✅
    // Field overrides
    risk_score_mapping, // ✅
    severity_mapping, // ✅
    // Rule schedule
    interval, // ✅
    from, // ✅
    to, // ✅
    // Rule actions
    actions, // ✅
    throttle, // ✅
    // Rule exceptions
    exceptions_list, // ✅
    // Misc attributes
    author, // ✅
    false_positives, // ✅
    references, // ✅
    // maxSignals not used in ML rules but probably should be used
    max_signals, // ✅
    threat, // ✅

    ...ruleWithoutAllCommonFields
  } = rule;

  // ---------------------------------------------------------------------------
  // Custom Query fields
  if (ruleWithoutAllCommonFields.type === 'query') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      response_actions, // ✅
      alert_suppression, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Saved Query fields
  if (ruleWithoutAllCommonFields.type === 'saved_query') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      response_actions, // ✅
      alert_suppression, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // EQL fields
  if (ruleWithoutAllCommonFields.type === 'eql') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      event_category_override, // ✅
      timestamp_field, // ✅
      tiebreaker_field, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Indicator Match fields
  if (ruleWithoutAllCommonFields.type === 'threat_match') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      threat_query, // ✅
      threat_mapping, // ✅
      threat_index, // ✅
      threat_filters, // ✅
      threat_indicator_path, // ✅
      threat_language, // ✅
      concurrent_searches, // ✅
      items_per_search, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Threshold fields
  if (ruleWithoutAllCommonFields.type === 'threshold') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      saved_id, // ✅
      threshold, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // Machine Learning fields
  if (ruleWithoutAllCommonFields.type === 'machine_learning') {
    const {
      type, // ✅
      machine_learning_job_id, // ✅
      anomaly_threshold, // ✅
      ...rest__________________________________
    } = ruleWithoutAllCommonFields;
  }

  // ---------------------------------------------------------------------------
  // New Terms fields
  if (ruleWithoutAllCommonFields.type === 'new_terms') {
    const {
      type, // ✅
      index, // ✅
      data_view_id, // ✅
      query, // ✅
      language, // ✅
      filters, // ✅
      new_terms_fields, // ✅
      history_window_start, // ✅
      ...rest_____________________
    } = ruleWithoutAllCommonFields;
  }
};
