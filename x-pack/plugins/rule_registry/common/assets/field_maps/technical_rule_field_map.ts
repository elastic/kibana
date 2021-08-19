/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pickWithPatterns } from '../../../common/pick_with_patterns';
import * as Fields from '../../../common/technical_rule_data_field_names';
import { ecsFieldMap } from './ecs_field_map';

export const technicalRuleFieldMap = {
  ...pickWithPatterns(
    ecsFieldMap,
    Fields.TIMESTAMP,
    Fields.EVENT_KIND,
    Fields.EVENT_ACTION,
    Fields.TAGS
  ),
  [Fields.ALERT_RULE_TYPE_ID]: { type: 'keyword', required: true },
  [Fields.ALERT_RULE_CONSUMER]: { type: 'keyword', required: true },
  [Fields.ALERT_RULE_PRODUCER]: { type: 'keyword' },
  [Fields.SPACE_IDS]: { type: 'keyword', array: true, required: true },
  [Fields.ALERT_UUID]: { type: 'keyword' },
  [Fields.ALERT_ID]: { type: 'keyword' },
  [Fields.ALERT_START]: { type: 'date' },
  [Fields.ALERT_END]: { type: 'date' },
  [Fields.ALERT_DURATION]: { type: 'long' },
  [Fields.ALERT_SEVERITY]: { type: 'keyword' },
  [Fields.ALERT_STATUS]: { type: 'keyword' },
  [Fields.ALERT_EVALUATION_THRESHOLD]: { type: 'scaled_float', scaling_factor: 100 },
  [Fields.ALERT_EVALUATION_VALUE]: { type: 'scaled_float', scaling_factor: 100 },
  [Fields.VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ECS_VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_SEVERITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_RISK_SCORE]: {
    type: 'float',
    array: false,
    required: false,
  },
  [Fields.ALERT_WORKFLOW_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_WORKFLOW_USER]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_WORKFLOW_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_SYSTEM_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_ACTION_GROUP]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_AUTHOR]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_CATEGORY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_UUID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_CREATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_CREATED_BY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_DESCRIPTION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_ENABLED]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_FROM]: {
    type: 'date',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_INTERVAL]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_LICENSE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_NAME]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_NOTE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_REFERENCES]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [Fields.ALERT_RULE_RISK_SCORE_MAPPING]: {
    type: 'object',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_RISK_SCORE_MAPPING}.field`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_RISK_SCORE_MAPPING}.operator`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_RISK_SCORE_MAPPING}.value`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_RULE_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_SEVERITY_MAPPING]: {
    type: 'object',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_SEVERITY_MAPPING}.field`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_SEVERITY_MAPPING}.operator`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_SEVERITY_MAPPING}.value`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [`${Fields.ALERT_RULE_SEVERITY_MAPPING}.severity`]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [Fields.ALERT_RULE_TO]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_TYPE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_UPDATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_UPDATED_BY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RULE_VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type TechnicalRuleFieldMap = typeof technicalRuleFieldMap;
