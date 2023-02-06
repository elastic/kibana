/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap } from '@kbn/alerting-plugin/common';
import { pickWithPatterns } from '../../pick_with_patterns';
import * as Fields from '../../technical_rule_data_field_names';
import { ecsFieldMap } from './ecs_field_map';

export const technicalRuleFieldMap = {
  ...pickWithPatterns(
    ecsFieldMap,
    Fields.TIMESTAMP,
    Fields.EVENT_KIND,
    Fields.EVENT_ACTION,
    Fields.TAGS
  ),
  [Fields.ALERT_ACTION_GROUP]: alertFieldMap[Fields.ALERT_ACTION_GROUP],
  [Fields.ALERT_CASE_IDS]: alertFieldMap[Fields.ALERT_CASE_IDS],
  [Fields.ALERT_DURATION]: alertFieldMap[Fields.ALERT_DURATION],
  [Fields.ALERT_END]: alertFieldMap[Fields.ALERT_END],
  [Fields.ALERT_FLAPPING]: alertFieldMap[Fields.ALERT_FLAPPING],
  [Fields.ALERT_INSTANCE_ID]: alertFieldMap[Fields.ALERT_INSTANCE_ID],
  [Fields.ALERT_REASON]: alertFieldMap[Fields.ALERT_REASON],
  [Fields.ALERT_RULE_CATEGORY]: alertFieldMap[Fields.ALERT_RULE_CATEGORY],
  [Fields.ALERT_RULE_CONSUMER]: alertFieldMap[Fields.ALERT_RULE_CONSUMER],
  [Fields.ALERT_RULE_EXECUTION_UUID]: alertFieldMap[Fields.ALERT_RULE_EXECUTION_UUID],
  [Fields.ALERT_RULE_NAME]: alertFieldMap[Fields.ALERT_RULE_NAME],
  // want to change to 'object', is that ok?
  [Fields.ALERT_RULE_PARAMETERS]: { type: 'flattened', ignore_above: 4096 },
  // ---------------------------------------
  [Fields.ALERT_RULE_PRODUCER]: alertFieldMap[Fields.ALERT_RULE_PRODUCER],
  [Fields.ALERT_RULE_TAGS]: alertFieldMap[Fields.ALERT_RULE_TAGS],
  [Fields.ALERT_RULE_TYPE_ID]: alertFieldMap[Fields.ALERT_RULE_TYPE_ID],
  [Fields.ALERT_RULE_UUID]: alertFieldMap[Fields.ALERT_RULE_UUID],
  [Fields.ALERT_START]: alertFieldMap[Fields.ALERT_START],
  [Fields.ALERT_STATUS]: alertFieldMap[Fields.ALERT_STATUS],
  [Fields.ALERT_TIME_RANGE]: alertFieldMap[Fields.ALERT_TIME_RANGE],
  [Fields.ALERT_UUID]: alertFieldMap[Fields.ALERT_UUID],
  [Fields.ALERT_WORKFLOW_STATUS]: alertFieldMap[Fields.ALERT_WORKFLOW_STATUS],
  [Fields.SPACE_IDS]: alertFieldMap[Fields.SPACE_IDS],
  [Fields.VERSION]: alertFieldMap[Fields.VERSION],

  [Fields.ALERT_SEVERITY]: { type: 'keyword' },
  [Fields.VERSION]: {
    type: 'version',
    array: false,
    required: false,
  },
  [Fields.ECS_VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [Fields.ALERT_RISK_SCORE]: {
    type: 'float',
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
  [Fields.ALERT_RULE_AUTHOR]: {
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
    type: 'keyword',
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
  [Fields.ALERT_SUPPRESSION_FIELD]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [Fields.ALERT_SUPPRESSION_VALUE]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [Fields.ALERT_SUPPRESSION_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [Fields.ALERT_SUPPRESSION_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [Fields.ALERT_SUPPRESSION_DOCS_COUNT]: {
    type: 'long',
    array: false,
    required: false,
  },
} as const;

export type TechnicalRuleFieldMap = typeof technicalRuleFieldMap;
