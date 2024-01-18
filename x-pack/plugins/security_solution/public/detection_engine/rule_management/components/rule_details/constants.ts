/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS: [string, string] = ['50%', '50%'];
export const LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS: [string, string] = ['30%', '70%'];

/**
 * This order is derived from a combination of the Rule Details Flyout display order
 * and the `DiffableRule` type that is returned from the rule diff API endpoint
 */
export const UPGRADE_FIELD_ORDER: string[] = [
  // Rule About fields
  'name',
  'description',
  'author',
  'building_block',
  'severity',
  'severity_mapping',
  'risk_score',
  'risk_score_mapping',
  'references',
  'false_positives',
  'investigation_fields',
  'license',
  'rule_name_override',
  'threat',
  'threat_indicator_path',
  'timestamp_override',
  'tags',
  // Rule Description fields
  'data_source',
  'type',
  'kql_query',
  'eql_query',
  'event_category_override',
  'timestamp_field',
  'tiebreaker_field',
  'esql_query',
  'anomaly_threshold',
  'machine_learning_job_id',
  'related_integrations',
  'required_fields',
  'timeline_template',
  'threshold',
  'threat_index',
  'threat_mapping',
  'threat_filters',
  'threat_query',
  'threat_indicator_path',
  'concurrent_searches',
  'items_per_search',
  'alert_suppression',
  'new_terms_fields',
  'history_window_start',
  // Rule Schedule fields
  'rule_schedule',
  // Rule Setup fields
  'setup',
  'note',
  // Other fields
  'throttle',
  'max_signals',
];
