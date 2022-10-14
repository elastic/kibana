/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleObjectId } from '../../../../../../common/detection_engine/rule_schema';
import type { IRuleExecutionLogForRoutes } from '../../../rule_monitoring';

export interface DeleteRuleOptions {
  ruleId: RuleObjectId;
  rulesClient: RulesClient;
  ruleExecutionLog: IRuleExecutionLogForRoutes;
}

export const deleteRules = async ({ ruleId, rulesClient, ruleExecutionLog }: DeleteRuleOptions) => {
  await rulesClient.delete({ id: ruleId });
  await ruleExecutionLog.clearExecutionSummary(ruleId);
};
