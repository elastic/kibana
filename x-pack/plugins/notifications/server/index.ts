/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export { notificationService, INotificationService, Action, ActionResult, Field } from './service';
export { createEmailAction } from './email';
export { createSlackAction } from './slack';
export { LoggerAction } from './logger';

export interface ServerFacade {
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
  config: () => { get<T>(key: string): T };
  plugins: { xpack_main: { info: { license: { isNotBasic: () => boolean } } } };
}

export interface RequestFacade {
  payload: object;
}
