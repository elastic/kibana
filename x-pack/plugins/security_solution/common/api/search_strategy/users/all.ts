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

export enum UsersFields {
  name = 'name',
  domain = 'domain',
  lastSeen = 'lastSeen',
}

export const usersSchema = requestOptionsPaginatedSchema
  .extend({
    sort: sort
      .unwrap()
      .extend({
        field: z.enum([UsersFields.name, UsersFields.lastSeen]),
      })
      .deepPartial()
      .optional(),
    timerange,
  })
  .passthrough();

export type UsersRequestOptions = z.infer<typeof usersSchema>;
