/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server, ServerRoute } from 'hapi';

export { notificationService, INotificationService, Action, ActionResult, Field } from './service';
export { createEmailAction } from './email';
export { createSlackAction } from './slack';
export { LoggerAction } from './logger';

/**
 * This is a subset of the hapi Server class functionality, to facilitate testing
 */
export interface IServer {
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
  route: (route: ServerRoute | ServerRoute[]) => void;
  config: () => void;
  plugins: any;
}
export type Server = Server | IServer;
