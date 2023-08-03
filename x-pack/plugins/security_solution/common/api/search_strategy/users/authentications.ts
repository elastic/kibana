/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// export interface UserAuthenticationsRequestOptions extends RequestOptionsPaginated {
//     defaultIndex: string[];
//     stackByField: AuthStackByField;
//   }

import { z } from 'zod';

import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { timerange } from '../model/timerange';

export enum AuthStackByField {
  userName = 'user.name',
  hostName = 'host.name',
}

export const userAuthenticationsSchema = requestOptionsPaginatedSchema.extend({
  stackByField: z.enum([AuthStackByField.userName, AuthStackByField.hostName]),
  timerange,
});

export type UserAuthenticationsRequestOptions = z.infer<typeof userAuthenticationsSchema>;
