/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { RunScriptActionRequestSchema } from '../response_actions/crowdstrike/run_script';
import { ExecuteActionRequestSchema } from '../response_actions/execute';
import { EndpointActionGetFileSchema } from '../response_actions/get_file';
import { IsolateRouteRequestSchema } from '../response_actions/isolate';
import { UnisolateRouteRequestSchema } from '../response_actions/unisolate';
import { GetProcessesRouteRequestSchema } from '../response_actions/running_procs';
import { KillProcessRouteRequestSchema } from '../response_actions/kill_process';
import { SuspendProcessRouteRequestSchema } from '../response_actions/suspend_process';
import { UploadActionRequestSchema } from '../response_actions/upload';

export const ResponseActionBodySchema = schema.oneOf([
  IsolateRouteRequestSchema.body,
  UnisolateRouteRequestSchema.body,
  GetProcessesRouteRequestSchema.body,
  KillProcessRouteRequestSchema.body,
  SuspendProcessRouteRequestSchema.body,
  EndpointActionGetFileSchema.body,
  ExecuteActionRequestSchema.body,
  UploadActionRequestSchema.body,
  RunScriptActionRequestSchema.body,
]);

export type ResponseActionsRequestBody = TypeOf<typeof ResponseActionBodySchema>;
