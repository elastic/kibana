/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { DeleteRuleArgs } from '../detection_rules_client_interface';

export const deleteRule = async (rulesClient: RulesClient, args: DeleteRuleArgs): Promise<void> => {
  const { ruleId } = args;
  await rulesClient.delete({ id: ruleId });
};
