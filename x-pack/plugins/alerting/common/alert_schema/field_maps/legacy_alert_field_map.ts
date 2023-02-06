/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_FIELD,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_VALUE,
  ALERT_SYSTEM_STATUS,
  ALERT_THREAT_FRAMEWORK,
  ALERT_THREAT_TACTIC_ID,
  ALERT_THREAT_TACTIC_NAME,
  ALERT_THREAT_TACTIC_REFERENCE,
  ALERT_THREAT_TECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_REFERENCE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_USER,
  ECS_VERSION,
  EVENT_ACTION,
  EVENT_KIND,
  EVENT_MODULE,
  TAGS,
} from '@kbn/rule-data-utils';
import { FieldMap } from './types';

export const legacyAlertFieldMap: FieldMap = {
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_CASE_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_DURATION]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_END]: {
    type: 'date',
    array: false,
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
  [ALERT_INSTANCE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_LAST_DETECTED]: {
    type: 'date',
    required: false,
    array: false,
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
  [ALERT_RULE_CONSUMER]: {
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
  [ALERT_RULE_PARAMETERS]: {
    type: 'object',
    enabled: false,
    required: false,
  },
  [ALERT_RULE_PRODUCER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_RULE_TYPE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_STATUS]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_TIME_RANGE]: {
    type: 'date_range',
    format: 'epoch_millis||strict_date_optional_time',
    array: false,
    required: false,
  },
  [ALERT_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_WORKFLOW_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [SPACE_IDS]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [TIMESTAMP]: {
    type: 'date',
    required: true,
    array: false,
  },
  [VERSION]: {
    type: 'version',
    array: false,
    required: false,
  },
};

export type AlertFieldMap = typeof alertFieldMap;
