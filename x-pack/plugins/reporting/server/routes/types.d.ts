/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';
import { CreateJobBaseParams, ReportingUser, ScheduledTaskParams } from '../types';

export type HandlerFunction = (
  user: ReportingUser,
  exportType: string,
  jobParams: CreateJobBaseParams,
  context: RequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory
) => any;

export type HandlerErrorFunction = (res: KibanaResponseFactory, err: Error) => any;

export interface QueuedJobPayload<JobParamsType> {
  error?: boolean;
  source: {
    job: {
      payload: ScheduledTaskParams<JobParamsType>;
    };
  };
}
