/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { UsersQueries } from '../../model/factory_query_type';

import { requestBasicOptionsSchema } from '../../model/request_basic_options';
import { timerange } from '../../model/timerange';

export const totalUsersKpiSchema = requestBasicOptionsSchema.extend({
  timerange,
  factoryQueryType: z.literal(UsersQueries.kpiTotalUsers),
});

export type TotalUsersKpiRequestOptionsInput = z.input<typeof totalUsersKpiSchema>;

export type TotalUsersKpiRequestOptions = z.infer<typeof totalUsersKpiSchema>;
