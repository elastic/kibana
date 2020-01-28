/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from '../../../../src/core/server';
import { AlertingPlugin } from './plugin';

export {
  AlertType,
  AlertingPlugin,
  AlertExecutorOptions,
  Alert,
  AlertAction,
  IntervalSchedule,
  AlertServices,
  State,
} from './types';
export { AlertsClient, FindOptions, FindResult } from './alerts_client';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { alertsClientMock } from './alerts_client.mock';
export { parseDuration } from './lib/parse_duration';

export const plugin = (initContext: PluginInitializerContext) => new AlertingPlugin(initContext);
