/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { RulesClient as RulesClientClass } from './rules_client';
import { AlertingPlugin } from './plugin';
import { configSchema } from './config';
import { AlertsConfigType } from './types';

export type RulesClient = PublicMethodsOf<RulesClientClass>;

export type {
  RuleType,
  ActionGroup,
  ActionGroupIdsOf,
  AlertingPlugin,
  RuleExecutorOptions,
  RuleExecutorServices,
  RuleActionParams,
  RuleTypeState,
  RuleTypeParams,
  PartialRule,
  AlertInstanceState,
  AlertInstanceContext,
  AlertingApiRequestHandlerContext,
  RuleParamsAndRefs,
} from './types';
export { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from './config';
export type { PluginSetupContract, PluginStartContract } from './plugin';
export type { FindResult } from './rules_client';
export type { PublicAlert as Alert } from './alert';
export { parseDuration } from './lib';
export { getEsErrorMessage } from './lib/errors';
export type { AlertingRulesConfig } from './config';
export {
  ReadOperations,
  AlertingAuthorizationFilterType,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from './authorization';

export const plugin = (initContext: PluginInitializerContext) => new AlertingPlugin(initContext);

export const config: PluginConfigDescriptor<AlertsConfigType> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.alerts.healthCheck', 'xpack.alerting.healthCheck', { level: 'warning' }),
    renameFromRoot(
      'xpack.alerts.invalidateApiKeysTask.interval',
      'xpack.alerting.invalidateApiKeysTask.interval',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.alerts.invalidateApiKeysTask.removalDelay',
      'xpack.alerting.invalidateApiKeysTask.removalDelay',
      { level: 'warning' }
    ),
    renameFromRoot('xpack.alerting.defaultRuleTaskTimeout', 'xpack.alerting.rules.run.timeout', {
      level: 'warning',
    }),
  ],
};
