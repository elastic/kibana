/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedAlert } from '../../../../../alerting/common';
import { RulesClient } from '../../../../../alerting/server';
import { RuleParams } from '../schemas/rule_schemas';

interface EnableRuleArgs {
  rule: SanitizedAlert<RuleParams>;
  rulesClient: RulesClient;
}

/**
 * Enables the rule and updates its status to 'going to run'
 *
 * @param rule - rule to enable
 * @param rulesClient - Alerts client
 */
export const enableRule = async ({ rule, rulesClient }: EnableRuleArgs) => {
  await rulesClient.enable({ id: rule.id });
};
