/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { filterQuery } from './filter_query';
import { timerange } from './timerange';

export const requestBasicOptionsSchema = z
  .object({
    timerange: timerange.optional(),
    filterQuery,
    defaultIndex: z.array(z.string()).optional(),

    // This comes from the IKibanaSearchRequest
    // TODO: make it an enum of the available factory types
    factoryQueryType: z.any().optional(),
    id: z.union([z.string(), z.undefined()]).optional(),
    params: z.any().optional(),
  })
  .passthrough();

export type RequestBasicOptions = z.infer<typeof requestBasicOptionsSchema>;
