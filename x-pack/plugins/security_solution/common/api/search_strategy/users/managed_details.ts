/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { UsersQueries } from '../model/factory_query_type';

import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const managedUserDetailsSchema = requestBasicOptionsSchema.extend({
  userName: z.string(),
  userEmail: z.array(z.string()).optional(),
  factoryQueryType: z.literal(UsersQueries.managedDetails),
});

export type ManagedUserDetailsRequestOptionsInput = z.input<typeof managedUserDetailsSchema>;

export type ManagedUserDetailsRequestOptions = z.infer<typeof managedUserDetailsSchema>;
