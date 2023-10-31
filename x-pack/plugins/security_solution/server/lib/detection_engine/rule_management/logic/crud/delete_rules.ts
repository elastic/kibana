/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleObjectId } from '../../../../../../common/api/detection_engine/model/rule_schema';

export interface DeleteRuleOptions {
  ruleId: RuleObjectId;
  rulesClient: RulesClient;
}

export const deleteRules = async ({ ruleId, rulesClient }: DeleteRuleOptions) => {
  await rulesClient.delete({ id: ruleId });
};
