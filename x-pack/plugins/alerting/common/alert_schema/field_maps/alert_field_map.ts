/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';

export const alertFieldMap = {
  [TIMESTAMP]: {
    type: 'date',
    required: true,
    array: false,
  },
  [ALERT_RULE_PARAMETERS]: {
    type: 'object',
    enabled: false,
    required: false,
  },
  [ALERT_RULE_TYPE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_CONSUMER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_PRODUCER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [SPACE_IDS]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [ALERT_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_TIME_RANGE]: {
    type: 'date_range',
    format: 'epoch_millis||strict_date_optional_time',
    array: false,
    required: false,
  },
  [ALERT_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_DURATION]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_STATUS]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [VERSION]: {
    type: 'version',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ACTION_GROUP]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_CATEGORY]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_EXECUTION_UUID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_FLAPPING]: {
    type: 'boolean',
    array: false,
    required: false,
  },
  [ALERT_FLAPPING_HISTORY]: {
    type: 'boolean',
    array: true,
    required: false,
  },
};

export type AlertFieldMap = typeof alertFieldMap;
