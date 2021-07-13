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
export { getRuleExecutorData, RuleExecutorData } from './utils/get_rule_executor_data';
export { createLifecycleRuleTypeFactory } from './utils/create_lifecycle_rule_type_factory';
export { createPersistenceRuleTypeFactory } from './utils/create_persistence_rule_type_factory';

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
