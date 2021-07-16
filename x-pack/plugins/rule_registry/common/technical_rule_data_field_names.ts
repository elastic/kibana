/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from '@kbn/rule-data-utils/target/technical_field_names';

// TODO: move the below to technical_field_names package
const KIBANA_NAMESPACE = 'kibana';
const ALERT_NAMESPACE = `${KIBANA_NAMESPACE}.alert` as const;
const RULE_NAMESPACE = `${ALERT_NAMESPACE}.rule` as const;

const ALERT_WORKFLOW_STATUS = `${ALERT_NAMESPACE}.workflow_status`;
const ALERT_WORKFLOW_USER = `${ALERT_NAMESPACE}.workflow_user`;
const ALERT_WORKFLOW_REASON = `${ALERT_NAMESPACE}.workflow_reason`;
const ALERT_SYSTEM_STATUS = `${ALERT_NAMESPACE}.system_status`;
const ALERT_ACTION_GROUP = `${ALERT_NAMESPACE}.action_group.*`;

const ALERT_SEVERITY = `${ALERT_NAMESPACE}.severity` as const;
const ALERT_RISK_SCORE = `${ALERT_NAMESPACE}.risk_score` as const;
const ALERT_RULE_SEVERITY = `${ALERT_NAMESPACE}.rule.severity` as const;
const ALERT_RULE_RISK_SCORE = `${ALERT_NAMESPACE}.rule.risk_score` as const;
const ALERT_STATUS = `${ALERT_NAMESPACE}.status` as const;

const ALERT_REASON = `${ALERT_NAMESPACE}.reason`;
const ALERT_RULE_AUTHOR = `${RULE_NAMESPACE}.author`;
const ALERT_RULE_CONSUMERS = `${RULE_NAMESPACE}.consumers`;
const ALERT_RULE_CREATED_AT = `${RULE_NAMESPACE}.created_at`;
const ALERT_RULE_CREATED_BY = `${RULE_NAMESPACE}.created_by`;
const ALERT_RULE_DESCRIPTION = `${RULE_NAMESPACE}.description`;
const ALERT_RULE_ENABLED = `${RULE_NAMESPACE}.enabled`;
const ALERT_RULE_FROM = `${RULE_NAMESPACE}.from`;
const ALERT_RULE_ID = `${RULE_NAMESPACE}.id`;
const ALERT_RULE_INTERVAL = `${RULE_NAMESPACE}.interval`;
const ALERT_RULE_LICENSE = `${RULE_NAMESPACE}.license`;
const ALERT_RULE_NAME = `${RULE_NAMESPACE}.name`;
const ALERT_RULE_NOTE = `${RULE_NAMESPACE}.note`;
const ALERT_RULE_REFERENCES = `${RULE_NAMESPACE}.references`;
const ALERT_RULE_RISK_SCORE_MAPPING = `${RULE_NAMESPACE}.risk_score_mapping`;
const ALERT_RULE_RULE_ID = `${RULE_NAMESPACE}.rule_id`;
const ALERT_RULE_RULE_NAME_OVERRIDE = `${RULE_NAMESPACE}.rule_name_override`;
const ALERT_RULE_SEVERITY_MAPPING = `${RULE_NAMESPACE}.severity_mapping`;
const ALERT_RULE_TAGS = `${RULE_NAMESPACE}.tags`;
const ALERT_RULE_TO = `${RULE_NAMESPACE}.to`;
const ALERT_RULE_TYPE = `${RULE_NAMESPACE}.type`;
const ALERT_RULE_UPDATED_AT = `${RULE_NAMESPACE}.updated_at`;
const ALERT_RULE_UPDATED_BY = `${RULE_NAMESPACE}.updated_by`;
const ALERT_RULE_VERSION = `${RULE_NAMESPACE}.version`;
const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;

export {
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
  ALERT_WORKFLOW_REASON,
  ALERT_SYSTEM_STATUS,
  ALERT_ACTION_GROUP,
  ALERT_REASON,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMERS,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_ID,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_RISK_SCORE,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_RISK_SCORE,
};
