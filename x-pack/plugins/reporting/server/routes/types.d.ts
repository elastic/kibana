/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import type {
  BaseParams,
  BaseParamsLegacyPDF,
  BasePayload,
  ReportingRequestHandlerContext,
  ReportingUser,
} from '../types';

export type HandlerFunction = (
  user: ReportingUser,
  exportType: string,
  jobParams: BaseParams | BaseParamsLegacyPDF,
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
