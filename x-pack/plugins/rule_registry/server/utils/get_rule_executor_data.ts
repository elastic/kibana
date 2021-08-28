/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertExecutorOptions } from '../../../alerting/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  TAGS,
} from '../../common/technical_rule_data_field_names';

export interface RuleExecutorData {
  [ALERT_RULE_CATEGORY]: string;
  [ALERT_RULE_TYPE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_PRODUCER]: string;
  [TAGS]: string[];
}

export function getRuleData(options: AlertExecutorOptions<any, any, any, any, any>) {
  return {
    [ALERT_RULE_TYPE_ID]: options.rule.ruleTypeId,
    [ALERT_RULE_UUID]: options.alertId,
    [ALERT_RULE_CATEGORY]: options.rule.ruleTypeName,
    [ALERT_RULE_NAME]: options.rule.name,
    [TAGS]: options.tags,
    [ALERT_RULE_PRODUCER]: options.rule.producer,
  };
}
