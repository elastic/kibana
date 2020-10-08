/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient as AlertsClientClass } from './alerts_client';
import { PluginInitializerContext } from '../../../../src/core/server';
import { AlertingPlugin } from './plugin';

export type AlertsClient = PublicMethodsOf<AlertsClientClass>;

export {
  ActionVariable,
  AlertType,
  ActionGroup,
  AlertingPlugin,
  AlertExecutorOptions,
  AlertActionParams,
  AlertServices,
  AlertTypeState,
  AlertTypeParams,
  PartialAlert,
  AlertInstanceState,
  AlertInstanceContext,
} from './types';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { FindResult } from './alerts_client';
export { AlertInstance } from './alert_instance';
export { parseDuration } from './lib';

export const plugin = (initContext: PluginInitializerContext) => new AlertingPlugin(initContext);
