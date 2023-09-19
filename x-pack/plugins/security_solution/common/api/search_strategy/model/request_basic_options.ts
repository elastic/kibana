/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { filterQuery } from './filter_query';

export const requestBasicOptionsSchema = z.object({
  timerange: z.object({
    interval: z.string(),
    from: z.string(),
    to: z.string(),
  }),
  filterQuery,
  defaultIndex: z.array(z.string()),

  // This comes from the IKibanaSearchRequest
  factoryQueryType: z.union([z.string(), z.undefined()]),
  id: z.union([z.string(), z.undefined()]),
  params: z.union([z.object({}), z.undefined()]),
});

export type RequestBasicOptions = z.infer<typeof requestBasicOptionsSchema>;
