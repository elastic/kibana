/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { RuleRegistryPlugin } from './plugin';

export type { RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract } from './plugin';
export type {
  RacRequestHandlerContext,
  RacApiRequestHandlerContext,
  AlertTypeWithExecutor,
} from './types';

export * from './config';
export * from './rule_data_plugin_service';
export * from './rule_data_client';

export { getRuleData, RuleExecutorData } from './utils/get_rule_executor_data';
export { createLifecycleRuleTypeFactory } from './utils/create_lifecycle_rule_type_factory';
export {
  LifecycleRuleExecutor,
  LifecycleAlertService,
  LifecycleAlertServices,
  createLifecycleExecutor,
} from './utils/create_lifecycle_executor';
export { createPersistenceRuleTypeFactory } from './utils/create_persistence_rule_type_factory';
export * from './utils/persistence_types';
export type { AlertsClient } from './alert_data_client/alerts_client';

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
