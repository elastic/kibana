/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from '../../../../src/core/server';
import { PluginNew } from './plugin_new';
export { notificationService, INotificationService, Action, ActionResult, Field } from './service';
export { createEmailAction } from './email';
export { createSlackAction } from './slack';
export { LoggerAction } from './logger';

export type LegacyLogger = (
  tags: string | string[],
  data?: string | object | (() => any),
  timestamp?: number
) => void;

export type LegacyConfig = () => { get<T>(key: string): T };

export interface ServerFacade {
  log: LegacyLogger;
  config: LegacyConfig;
  plugins: { xpack_main: unknown };
}

export interface RequestFacade {
  payload: object;
}

export function plugin(initializerContext: PluginInitializerContext) {
  return new PluginNew(initializerContext);
}
