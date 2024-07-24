/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  KillProcessRouteRequestSchema,
  SuspendProcessRouteRequestSchema,
  UploadActionRequestSchema,
} from '../..';
import { ExecuteActionRequestSchema } from '../execute_route';
import { EndpointActionGetFileSchema } from '../get_file_route';
import { ScanActionRequestSchema } from '../scan_route';
import { NoParametersRequestSchema } from './base';

export const ResponseActionBodySchema = schema.oneOf([
  NoParametersRequestSchema.body,
  KillProcessRouteRequestSchema.body,
  SuspendProcessRouteRequestSchema.body,
  EndpointActionGetFileSchema.body,
  ExecuteActionRequestSchema.body,
  ScanActionRequestSchema.body,
  UploadActionRequestSchema.body,
]);

export type ResponseActionsRequestBody = TypeOf<typeof ResponseActionBodySchema>;
