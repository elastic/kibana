/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertExecutorOptions } from '../../../alerting/server';
import {
  PRODUCER,
  RULE_CATEGORY,
  RULE_ID,
  RULE_NAME,
  RULE_UUID,
  TAGS,
} from '../../common/technical_rule_data_field_names';
import { AlertTypeExecutor, AlertTypeWithExecutor } from '../types';

export interface RuleExecutorData {
  [RULE_CATEGORY]: string;
  [RULE_ID]: string;
  [RULE_UUID]: string;
  [RULE_NAME]: string;
  [PRODUCER]: string;
  [TAGS]: string[];
}

export function getRuleExecutorData(
  type: AlertTypeWithExecutor<any, any, any>,
  options: Parameters<AlertTypeExecutor>[0]
) {
  return {
    [RULE_ID]: type.id,
    [RULE_UUID]: options.alertId,
    [RULE_CATEGORY]: type.name,
    [RULE_NAME]: options.name,
    [TAGS]: options.tags,
    [PRODUCER]: type.producer,
  };
}

export function getRuleData(options: AlertExecutorOptions<any, any, any, any, any>) {
  return {
    [RULE_ID]: options.rule.ruleTypeId,
    [RULE_UUID]: options.alertId,
    [RULE_CATEGORY]: options.rule.ruleTypeName,
    [RULE_NAME]: options.rule.name,
    [TAGS]: options.tags,
    [PRODUCER]: options.rule.producer,
  };
}
