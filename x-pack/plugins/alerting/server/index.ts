/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertsClient as AlertsClientClass } from './alerts_client';
import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../src/core/server';
import { AlertingPlugin } from './plugin';
import { configSchema } from './config';
import { AlertsConfigType } from './types';

export type AlertsClient = PublicMethodsOf<AlertsClientClass>;

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
} from './types';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { FindResult } from './alerts_client';
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
  ],
};
