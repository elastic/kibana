/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';

export const networkHttpSchema = requestOptionsPaginatedSchema.extend({
  ip: z.string().ip().optional(),
  defaultIndex: z.array(z.string()).min(1).optional(),
  timerange,
  sort: sort.removeDefault().extend({
    field: z.string(),
  }),
});

export type NetworkHttpRequestOptionsInput = z.input<typeof networkHttpSchema>;

export type NetworkHttpRequestOptions = z.infer<typeof networkHttpSchema>;
