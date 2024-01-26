/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { HostsQueries } from '../model/factory_query_type';
import { pagination } from '../model/pagination';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';

export const hostUncommonProcessesSchema = requestBasicOptionsSchema.extend({
  sort,
  pagination,
  timerange,
  factoryQueryType: z.literal(HostsQueries.uncommonProcesses),
});

export type HostUncommonProcessesRequestOptionsInput = z.input<typeof hostUncommonProcessesSchema>;

export type HostUncommonProcessesRequestOptions = z.infer<typeof hostUncommonProcessesSchema>;
