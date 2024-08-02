/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { ExecuteActionRequestSchema } from '../execute_route';
import { EndpointActionGetFileSchema } from '../get_file_route';
import { ScanActionRequestSchema } from '../scan_route';
import { GetProcessesRouteRequestSchema } from '../get_processes_route';
import { KillProcessRouteRequestSchema } from '../kill_process_route';
import { SuspendProcessRouteRequestSchema } from '../suspend_process_route';
import { UploadActionRequestSchema } from '../file_upload_route';
import { IsolateRouteRequestSchema } from '../response_actions/isolate';
import { UnisolateRouteRequestSchema } from '../response_actions/unisolate';

export const ResponseActionBodySchema = schema.oneOf([
  IsolateRouteRequestSchema.body,
  UnisolateRouteRequestSchema.body,
  GetProcessesRouteRequestSchema.body,
  KillProcessRouteRequestSchema.body,
  SuspendProcessRouteRequestSchema.body,
  EndpointActionGetFileSchema.body,
  ExecuteActionRequestSchema.body,
  UploadActionRequestSchema.body,
  ScanActionRequestSchema.body,
]);

export type ResponseActionsRequestBody = TypeOf<typeof ResponseActionBodySchema>;
