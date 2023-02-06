/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap, legacyAlertFieldMap } from '@kbn/alerting-plugin/common';
import * as Fields from '../../technical_rule_data_field_names';

export const technicalRuleFieldMap = {
  // These fields are defined in the framework alerts as data field map and will
  // be used for FAAD
  [Fields.TIMESTAMP]: alertFieldMap[Fields.TIMESTAMP],
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

  // These fields are defined in the legacy alerts as data field map to maintain
  // backwards compatibility with rule registry alerts as data
  [Fields.ALERT_RISK_SCORE]: legacyAlertFieldMap[Fields.ALERT_RISK_SCORE],
  [Fields.ALERT_RULE_AUTHOR]: legacyAlertFieldMap[Fields.ALERT_RULE_AUTHOR],
  [Fields.ALERT_RULE_CREATED_AT]: legacyAlertFieldMap[Fields.ALERT_RULE_CREATED_AT],
  [Fields.ALERT_RULE_CREATED_BY]: legacyAlertFieldMap[Fields.ALERT_RULE_CREATED_BY],
  [Fields.ALERT_RULE_DESCRIPTION]: legacyAlertFieldMap[Fields.ALERT_RULE_DESCRIPTION],
  [Fields.ALERT_RULE_ENABLED]: legacyAlertFieldMap[Fields.ALERT_RULE_ENABLED],
  [Fields.ALERT_RULE_FROM]: legacyAlertFieldMap[Fields.ALERT_RULE_FROM],
  [Fields.ALERT_RULE_INTERVAL]: legacyAlertFieldMap[Fields.ALERT_RULE_INTERVAL],
  [Fields.ALERT_RULE_LICENSE]: legacyAlertFieldMap[Fields.ALERT_RULE_LICENSE],
  [Fields.ALERT_RULE_NOTE]: legacyAlertFieldMap[Fields.ALERT_RULE_NOTE],
  [Fields.ALERT_RULE_REFERENCES]: legacyAlertFieldMap[Fields.ALERT_RULE_REFERENCES],
  [Fields.ALERT_RULE_RULE_ID]: legacyAlertFieldMap[Fields.ALERT_RULE_RULE_ID],
  [Fields.ALERT_RULE_RULE_NAME_OVERRIDE]: legacyAlertFieldMap[Fields.ALERT_RULE_RULE_NAME_OVERRIDE],
  [Fields.ALERT_RULE_TO]: legacyAlertFieldMap[Fields.ALERT_RULE_TO],
  [Fields.ALERT_RULE_TYPE]: legacyAlertFieldMap[Fields.ALERT_RULE_TYPE],
  [Fields.ALERT_RULE_UPDATED_AT]: legacyAlertFieldMap[Fields.ALERT_RULE_UPDATED_AT],
  [Fields.ALERT_RULE_UPDATED_BY]: legacyAlertFieldMap[Fields.ALERT_RULE_UPDATED_BY],
  [Fields.ALERT_RULE_VERSION]: legacyAlertFieldMap[Fields.ALERT_RULE_VERSION],
  [Fields.ALERT_SEVERITY]: legacyAlertFieldMap[Fields.ALERT_SEVERITY],
  [Fields.ALERT_SUPPRESSION_DOCS_COUNT]: legacyAlertFieldMap[Fields.ALERT_SUPPRESSION_DOCS_COUNT],
  [Fields.ALERT_SUPPRESSION_END]: legacyAlertFieldMap[Fields.ALERT_SUPPRESSION_END],
  [Fields.ALERT_SUPPRESSION_FIELD]: legacyAlertFieldMap[Fields.ALERT_SUPPRESSION_FIELD],
  [Fields.ALERT_SUPPRESSION_START]: legacyAlertFieldMap[Fields.ALERT_SUPPRESSION_START],
  [Fields.ALERT_SUPPRESSION_VALUE]: legacyAlertFieldMap[Fields.ALERT_SUPPRESSION_VALUE],
  [Fields.ALERT_SYSTEM_STATUS]: legacyAlertFieldMap[Fields.ALERT_SYSTEM_STATUS],
  [Fields.ALERT_WORKFLOW_REASON]: legacyAlertFieldMap[Fields.ALERT_WORKFLOW_REASON],
  [Fields.ALERT_WORKFLOW_USER]: legacyAlertFieldMap[Fields.ALERT_WORKFLOW_USER],
  [Fields.ECS_VERSION]: legacyAlertFieldMap[Fields.ECS_VERSION],
  [Fields.EVENT_ACTION]: legacyAlertFieldMap[Fields.EVENT_ACTION],
  [Fields.EVENT_KIND]: legacyAlertFieldMap[Fields.EVENT_KIND],
  [Fields.TAGS]: legacyAlertFieldMap[Fields.TAGS],
} as const;

export type TechnicalRuleFieldMap = typeof technicalRuleFieldMap;
