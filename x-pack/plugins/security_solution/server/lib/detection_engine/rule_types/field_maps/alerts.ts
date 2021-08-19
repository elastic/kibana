/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON } from '@kbn/rule-data-utils';
import { FieldMap } from '../../../../../../rule_registry/common/field_map';
import {
  ALERT_ANCESTORS,
  ALERT_ANCESTORS_DEPTH,
  ALERT_ANCESTORS_ID,
  ALERT_ANCESTORS_INDEX,
  ALERT_ANCESTORS_RULE,
  ALERT_ANCESTORS_TYPE,
  ALERT_DEPTH,
  ALERT_GROUP,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_EVENT_ACTION,
  ALERT_ORIGINAL_EVENT_AGENT_ID_STATUS,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_ORIGINAL_EVENT_CODE,
  ALERT_ORIGINAL_EVENT_CREATED,
  ALERT_ORIGINAL_EVENT_DATASET,
  ALERT_ORIGINAL_EVENT_DURATION,
  ALERT_ORIGINAL_EVENT_END,
  ALERT_ORIGINAL_EVENT_HASH,
  ALERT_ORIGINAL_EVENT_ID,
  ALERT_ORIGINAL_EVENT_INGESTED,
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_EVENT_ORIGINAL,
  ALERT_ORIGINAL_EVENT_OUTCOME,
  ALERT_ORIGINAL_EVENT_PROVIDER,
  ALERT_ORIGINAL_EVENT_REASON,
  ALERT_ORIGINAL_EVENT_REFERENCE,
  ALERT_ORIGINAL_EVENT_RISK_SCORE,
  ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM,
  ALERT_ORIGINAL_EVENT_SEQUENCE,
  ALERT_ORIGINAL_EVENT_START,
  ALERT_ORIGINAL_EVENT_TIMEZONE,
  ALERT_ORIGINAL_EVENT_TYPE,
  ALERT_ORIGINAL_EVENT_URL,
  ALERT_ORIGINAL_TIME,
  ALERT_THREAT,
  ALERT_THREAT_FRAMEWORK,
  ALERT_THREAT_TACTIC,
  ALERT_THREAT_TACTIC_ID,
  ALERT_THREAT_TACTIC_NAME,
  ALERT_THREAT_TACTIC_REFERENCE,
  ALERT_THREAT_TECHNIQUE,
  ALERT_THREAT_TECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_REFERENCE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE,
  ALERT_THRESHOLD_RESULT,
  ALERT_THRESHOLD_RESULT_CARDINALITY,
  ALERT_THRESHOLD_RESULT_CARDINALITY_FIELD,
  ALERT_THRESHOLD_RESULT_CARDINALITY_VALUE,
  ALERT_THRESHOLD_RESULT_COUNT,
  ALERT_THRESHOLD_RESULT_FROM,
  ALERT_THRESHOLD_RESULT_TERMS,
  ALERT_THRESHOLD_RESULT_TERMS_FIELD,
  ALERT_THRESHOLD_RESULT_TERMS_VALUE,
} from './../../../../../../timelines/common/alerts';

export const alertsFieldMap: FieldMap = {
  [ALERT_ANCESTORS]: {
    type: 'object',
    array: true,
    required: true,
  },
  [ALERT_ANCESTORS_DEPTH]: {
    type: 'long',
    array: false,
    required: true,
  },
  [ALERT_ANCESTORS_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ANCESTORS_INDEX]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ANCESTORS_RULE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ANCESTORS_TYPE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_DEPTH]: {
    type: 'long',
    array: false,
    required: true,
  },
  [ALERT_GROUP]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_GROUP_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_GROUP_INDEX]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_ACTION]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_AGENT_ID_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_CATEGORY]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_CODE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_CREATED]: {
    type: 'date',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_DATASET]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_DURATION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_HASH]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_INGESTED]: {
    type: 'date',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_KIND]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_MODULE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_ORIGINAL]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_OUTCOME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_PROVIDER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_REFERENCE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_RISK_SCORE]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_SEQUENCE]: {
    type: 'long',
    array: false,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_TIMEZONE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_EVENT_TYPE]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [ALERT_ORIGINAL_EVENT_URL]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_TIME]: {
    type: 'date',
    array: false,
    required: true,
  },
  [ALERT_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_THREAT]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_THREAT_FRAMEWORK]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TACTIC]: {
    type: 'object',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TACTIC_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TACTIC_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TACTIC_REFERENCE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE]: {
    type: 'object',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_REFERENCE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE]: {
    type: 'object',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_THRESHOLD_RESULT]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_CARDINALITY]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_CARDINALITY_FIELD]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_CARDINALITY_VALUE]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_COUNT]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_FROM]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_TERMS]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_TERMS_FIELD]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_THRESHOLD_RESULT_TERMS_VALUE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap = typeof alertsFieldMap;
