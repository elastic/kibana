/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110907
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from 'src/core/server';
import { RuleRegistryPlugin } from './plugin';

export type { RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract } from './plugin';
export type { IRuleDataService, RuleDataPluginService } from './rule_data_plugin_service';
export { RuleDataClient } from './rule_data_client';
export type { IRuleDataClient } from './rule_data_client/types';
export type {
  RacRequestHandlerContext,
  RacApiRequestHandlerContext,
  AlertTypeWithExecutor,
} from './types';

export * from './config';
export * from './rule_data_plugin_service';
export * from './rule_data_client';
export * from './alert_data_client/audit_events';

export { createLifecycleRuleTypeFactory } from './utils/create_lifecycle_rule_type_factory';
export type {
  LifecycleRuleExecutor,
  LifecycleAlertService,
  LifecycleAlertServices,
} from './utils/create_lifecycle_executor';
export { createLifecycleExecutor } from './utils/create_lifecycle_executor';
export { createPersistenceRuleTypeWrapper } from './utils/create_persistence_rule_type_wrapper';
export * from './utils/persistence_types';
export type { AlertsClient } from './alert_data_client/alerts_client';

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
