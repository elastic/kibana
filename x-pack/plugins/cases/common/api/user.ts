/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const UserSchema = z
  .object({
    email: z.string().nullish(),
    full_name: z.string().nullish(),
    username: z.string().nullish(),
    profile_uid: z.optional(z.string()),
  })
  .strict();

export const UsersSchema = z.array(UserSchema);

export type User = z.infer<typeof UserSchema>;
