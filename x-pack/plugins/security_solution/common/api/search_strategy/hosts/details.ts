/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { inspect } from '../model/inspect';
import { pagination } from '../model/pagination';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { timerange } from '../model/timerange';
import { sort } from './model/sort';

export const hostDetailsSchema = z
  .object({
    hostName: z.string(),
    skip: z.boolean().optional(),
    inspect,
    pagination,
  })
  .extend(requestBasicOptionsSchema.shape)
  .extend({ timerange, sort: sort.optional() });

export type HostDetailsRequestOptions = z.infer<typeof hostDetailsSchema>;
