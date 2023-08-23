/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { pagination } from '../model/pagination';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { timerange } from '../model/timerange';
import { sort } from './model/sort';

export const allHostsSchema = z
  .object({
    sort: sort.unwrap().required(),
    pagination: pagination.required(),
    isNewRiskScoreModuleAvailable: z.boolean(),
  })
  .extend(requestBasicOptionsSchema.partial().shape)
  .extend(z.object({ timerange }).shape)
  .passthrough();

export type HostsRequestOptions = z.infer<typeof allHostsSchema>;
