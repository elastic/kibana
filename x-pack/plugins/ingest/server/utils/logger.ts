/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

const LOGGING_TAGS = ['ingest'];

export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export const createLogger = (kbnServer: Readonly<Server>): Readonly<Logger> => ({
  debug: (message: string) => kbnServer.log(['debug', ...LOGGING_TAGS], message),
  info: (message: string) => kbnServer.log(['info', ...LOGGING_TAGS], message),
  warn: (message: string) => kbnServer.log(['warning', ...LOGGING_TAGS], message),
  error: (message: string) => kbnServer.log(['error', ...LOGGING_TAGS], message),
});
