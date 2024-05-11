/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { RulesClient as RulesClientClass } from './rules_client';
import { AlertingConfig, configSchema } from './config';

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
  SummarizedAlertsChunk,
  ScopedQueryAlerts,
  ExecutorType,
  IRuleTypeAlerts,
  GetViewInAppRelativeUrlFnOpts,
  DataStreamAdapter,
} from './types';
export { DEFAULT_AAD_CONFIG } from './types';
export { RULE_SAVED_OBJECT_TYPE, API_KEY_PENDING_INVALIDATION_TYPE } from './saved_objects';
export { RuleNotifyWhen } from '../common';
export { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from './config';
export type { PluginSetupContract, PluginStartContract } from './plugin';
export type { FindResult, BulkEditOperation, BulkOperationError } from './rules_client';
export type { Rule } from './application/rule/types';
export type { PublicAlert as Alert } from './alert';
export { parseDuration, isRuleSnoozed } from './lib';
export { getEsErrorMessage } from './lib/errors';
export type { AlertingRulesConfig } from './config';
export {
  ReadOperations,
  AlertingAuthorizationFilterType,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from './authorization';
export {
  DEFAULT_ALERTS_ILM_POLICY,
  DEFAULT_ALERTS_ILM_POLICY_NAME,
  ECS_COMPONENT_TEMPLATE_NAME,
  ECS_CONTEXT,
  TOTAL_FIELDS_LIMIT,
  VALID_ALERT_INDEX_PREFIXES,
  getComponentTemplate,
  type PublicFrameworkAlertsService,
  createOrUpdateIlmPolicy,
  createOrUpdateComponentTemplate,
  getIndexTemplate,
  createOrUpdateIndexTemplate,
  createConcreteWriteIndex,
  installWithTimeout,
  isValidAlertIndexName,
  InstallShutdownError,
} from './alerts_service';
export { sanitizeBulkErrorResponse, AlertsClientError } from './alerts_client';
export { getDataStreamAdapter } from './alerts_service/lib/data_stream_adapter';
export type { ConnectorAdapter } from './connector_adapters/types';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { AlertingPlugin } = await import('./plugin');
  return new AlertingPlugin(initContext);
};

export const config: PluginConfigDescriptor<AlertingConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    rules: { run: { alerts: { max: true } } },
  },
  deprecations: ({ renameFromRoot, deprecate }) => [
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
    deprecate('maxEphemeralActionsPerAlert', 'a future version', {
      level: 'warning',
      message: `Configuring "xpack.alerting.maxEphemeralActionsPerAlert" is deprecated and will be removed in a future version. Remove this setting to increase action execution resiliency.`,
    }),
  ],
};
