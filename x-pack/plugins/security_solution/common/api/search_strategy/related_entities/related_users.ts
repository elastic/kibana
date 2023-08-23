/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { inspect } from '../model/inspect';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const relatedUsersRequestOptionsSchema = requestBasicOptionsSchema.extend({
  hostName: z.string(),
  skip: z.boolean().optional(),
  from: z.string(),
  inspect,
  isNewRiskScoreModuleAvailable: z.boolean().default(false),
});

export type RelatedUsersRequestOptionsInput = z.input<typeof relatedUsersRequestOptionsSchema>;

export type RelatedUsersRequestOptions = z.infer<typeof relatedUsersRequestOptionsSchema>;
