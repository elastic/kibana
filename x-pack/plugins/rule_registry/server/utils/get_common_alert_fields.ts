/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  ALERT_RULE_TAGS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import { RuleExecutorOptions } from '../../../alerting/server';
import { CommonAlertFieldsLatest } from '../../common/schemas';

export const getCommonAlertFields = (
  options: RuleExecutorOptions<any, any, any, any, any>
): CommonAlertFieldsLatest => {
  return {
    [ALERT_RULE_CATEGORY]: options.rule.ruleTypeName,
    [ALERT_RULE_CONSUMER]: options.rule.consumer,
    [ALERT_RULE_EXECUTION_UUID]: options.executionId,
    [ALERT_RULE_NAME]: options.rule.name,
    [ALERT_RULE_PRODUCER]: options.rule.producer,
    [ALERT_RULE_TYPE_ID]: options.rule.ruleTypeId,
    [ALERT_RULE_UUID]: options.alertId,
    [SPACE_IDS]: [options.spaceId],
    [ALERT_RULE_TAGS]: options.tags,
    [TIMESTAMP]: options.startedAt.toISOString(),
  };
};
