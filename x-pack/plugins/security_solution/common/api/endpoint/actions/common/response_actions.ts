/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ExecuteActionRequestSchema } from '../execute_route';
import { EndpointActionGetFileSchema } from '../get_file_route';
import { KillOrSuspendProcessRequestSchema, NoParametersRequestSchema } from './base';

export const ResponseActionBodySchema = schema.oneOf([
  NoParametersRequestSchema.body,
  KillOrSuspendProcessRequestSchema.body,
  EndpointActionGetFileSchema.body,
  ExecuteActionRequestSchema.body,
]);
