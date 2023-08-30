/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';

import { order } from '../model/order';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { inspect } from '../model/inspect';
import { FirstLastSeenQuery } from '../model/factory_query_type';

export const firstLastSeenRequestOptionsSchema = requestBasicOptionsSchema.extend({
  order,
  field: z.string(),
  value: z.string(),
  factoryQueryType: z.literal(FirstLastSeenQuery),
});

export type FirstLastSeenRequestOptionsInput = z.input<typeof firstLastSeenRequestOptionsSchema>;

export type FirstLastSeenRequestOptions = z.infer<typeof firstLastSeenRequestOptionsSchema>;

export const firstLastSeenResponseSchema = z
  .object({
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
    inspect,
  })
  .partial();

export type FirstLastSeenStrategyResponse = z.input<typeof firstLastSeenResponseSchema> &
  IKibanaSearchResponse;
