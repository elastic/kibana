/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '../../../../src/core/server/plugins/types';
import { RuleRegistryPlugin } from './plugin';

export type { AlertsClient } from './alert_data_client/alerts_client';
export * from './config';
export type { RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract } from './plugin';
export * from './rule_data_client';
export * from './rule_data_plugin_service';
export type {
  AlertTypeWithExecutor,
  RacApiRequestHandlerContext,
  RacRequestHandlerContext,
} from './types';
export {
  createLifecycleExecutor,
  LifecycleAlertService,
  LifecycleAlertServices,
  LifecycleRuleExecutor,
} from './utils/create_lifecycle_executor';
export { createLifecycleRuleTypeFactory } from './utils/create_lifecycle_rule_type_factory';
export { createPersistenceRuleTypeFactory } from './utils/create_persistence_rule_type_factory';
export { getRuleData, RuleExecutorData } from './utils/get_rule_executor_data';
export * from './utils/persistence_types';

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
