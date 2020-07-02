/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';
import { SessionService } from './session_service';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    sessionService?: SessionService;
  }
}
export interface SessionInfo {
  requests: Map<string, string>;
  insertTime: Moment;
  userId: string;
  retryCount: number;
}

export interface SessionKeys {
  [key: string]: any;
}
