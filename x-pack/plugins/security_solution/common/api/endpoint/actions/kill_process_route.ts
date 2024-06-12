/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  BaseActionRequestSchema,
  KillOrSuspendProcessRequestParametersSchema,
} from './common/base';

export const KillProcessRouteRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: KillOrSuspendProcessRequestParametersSchema,
  }),
};
// // FIXME:PT code this param so that it applies only to sentinelOne
// schema.object({ process_name: schema.string({ minLength: 1 }) }),
