/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { RulesClient as RulesClientClass } from './rules_client';
import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../src/core/server';
import { AlertingPlugin } from './plugin';
import { configSchema } from './config';
import { AlertsConfigType } from './types';

export type RulesClient = PublicMethodsOf<RulesClientClass>;

export type {
  AlertType,
  ActionGroup,
  ActionGroupIdsOf,
  AlertingPlugin,
  AlertExecutorOptions,
  AlertActionParams,
  AlertServices,
  AlertTypeState,
  AlertTypeParams,
  PartialAlert,
  AlertInstanceState,
  AlertInstanceContext,
  AlertingApiRequestHandlerContext,
  RuleParamsAndRefs,
} from './types';
export { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from './config';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { FindResult } from './rules_client';
export { PublicAlertInstance as AlertInstance } from './alert_instance';
export { parseDuration } from './lib';
export { getEsErrorMessage } from './lib/errors';
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
