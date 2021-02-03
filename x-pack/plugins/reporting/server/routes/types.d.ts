/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import type {
  BaseParams,
  BasePayload,
  ReportingUser,
  ReportingRequestHandlerContext,
} from '../types';

export type HandlerFunction = (
  user: ReportingUser,
  exportType: string,
  jobParams: BaseParams,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory
) => any;

export type HandlerErrorFunction = (res: KibanaResponseFactory, err: Error) => any;

export interface QueuedJobPayload {
  error?: boolean;
  source: {
    job: {
      payload: BasePayload;
    };
  };
}
