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
import { flowTarget } from './model/flow_target';

export enum NetworkUsersFields {
  name = 'name',
  count = 'count',
}

const networkUsersFields = z.enum([NetworkUsersFields.name, NetworkUsersFields.count]);

export const networkUsersSchema = requestOptionsPaginatedSchema.extend({
  ip: z.string().ip(),
  flowTarget,
  sort: sort.unwrap().required().extend({
    field: networkUsersFields,
  }),
  timerange,
});

export type NetworkUsersRequestOptions = z.infer<typeof networkUsersSchema>;
