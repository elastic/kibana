/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { inspect } from '../model/inspect';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const relatedHostsRequestOptionsSchema = requestBasicOptionsSchema.extend({
  userName: z.string(),
  skip: z.boolean().optional(),
  from: z.string(),
  inspect,
});

export type RelatedHostsRequestOptions = z.infer<typeof relatedHostsRequestOptionsSchema>;
