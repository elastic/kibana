/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { RuleRegistryPlugin } from './plugin';

export * from './config';
export type { RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract } from './plugin';
export type { RacRequestHandlerContext, RacApiRequestHandlerContext } from './types';
export { RuleDataClient } from './rule_data_client';
export { IRuleDataClient } from './rule_data_client/types';
export { getRuleData, RuleExecutorData } from './utils/get_rule_executor_data';
export {
  createLifecycleRuleTypeFactory,
  LifecycleAlertService,
} from './utils/create_lifecycle_rule_type_factory';
export {
  LifecycleRuleExecutor,
  LifecycleAlertServices,
  createLifecycleExecutor,
} from './utils/create_lifecycle_executor';
export { createPersistenceRuleTypeFactory } from './utils/create_persistence_rule_type_factory';
export type { AlertTypeWithExecutor } from './types';

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
