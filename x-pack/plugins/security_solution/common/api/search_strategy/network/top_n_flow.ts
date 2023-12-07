/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { NetworkQueries } from '../model/factory_query_type';
import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';
import { flowTarget } from './model/flow_target';

export const networkTopNFlowSchema = requestOptionsPaginatedSchema.extend({
  ip: z.string().ip().nullable().optional(),
  flowTarget,
  sort,
  timerange,
  factoryQueryType: z.literal(NetworkQueries.topNFlow),
});

export type NetworkTopNFlowRequestOptionsInput = z.input<typeof networkTopNFlowSchema>;

export type NetworkTopNFlowRequestOptions = z.infer<typeof networkTopNFlowSchema>;
