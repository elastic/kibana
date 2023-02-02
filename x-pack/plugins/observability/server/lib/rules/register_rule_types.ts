/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';
import { createLifecycleExecutor, IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { sloBurnRateRuleType } from './slo_burn_rate';

export function registerRuleTypes(
  alertingPlugin: PluginSetupContract,
  logger: Logger,
  ruleDataClient: IRuleDataClient
) {
  const createLifecycleRuleExecutor = createLifecycleExecutor(logger.get('rules'), ruleDataClient);
  alertingPlugin.registerType(sloBurnRateRuleType(createLifecycleRuleExecutor));
}
