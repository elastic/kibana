/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const SuggestUserProfilesRequestSchema = z
  .object({
    name: z.string(),
    owners: z.array(z.string()),
    size: z.optional(z.number()),
  })
  .strict();

export type SuggestUserProfilesRequest = z.infer<typeof SuggestUserProfilesRequestSchema>;

export const CaseUserProfileSchema = z.object({ uid: z.string() }).strict();

export type CaseUserProfile = z.infer<typeof CaseUserProfileSchema>;
