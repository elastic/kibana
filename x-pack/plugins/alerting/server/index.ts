/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { get } from 'lodash';
import type {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '../../../../src/core/server/plugins/types';
import { configSchema } from './config';
import { AlertingPlugin } from './plugin';
import { RulesClient as RulesClientClass } from './rules_client/rules_client';
import type { AlertsConfigType } from './types';

export type RulesClient = PublicMethodsOf<RulesClientClass>;

export { PublicAlertInstance as AlertInstance } from './alert_instance';
export {
  AlertingAuthorization,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  ReadOperations,
  WriteOperations,
} from './authorization';
export { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from './config';
export { parseDuration } from './lib';
export { getEsErrorMessage } from './lib/errors';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { FindResult } from './rules_client';
export type {
  ActionGroup,
  ActionGroupIdsOf,
  AlertActionParams,
  AlertExecutorOptions,
  AlertingApiRequestHandlerContext,
  AlertingPlugin,
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  PartialAlert,
  RuleParamsAndRefs,
} from './types';

export const plugin = (initContext: PluginInitializerContext) => new AlertingPlugin(initContext);

export const config: PluginConfigDescriptor<AlertsConfigType> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.alerts.healthCheck', 'xpack.alerting.healthCheck'),
    renameFromRoot(
      'xpack.alerts.invalidateApiKeysTask.interval',
      'xpack.alerting.invalidateApiKeysTask.interval'
    ),
    renameFromRoot(
      'xpack.alerts.invalidateApiKeysTask.removalDelay',
      'xpack.alerting.invalidateApiKeysTask.removalDelay'
    ),
    (settings, fromPath, addDeprecation) => {
      const alerting = get(settings, fromPath);
      if (alerting?.enabled === false || alerting?.enabled === true) {
        addDeprecation({
          message: `"xpack.alerting.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.alerting.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};
