/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { EntityStoreQueries } from '../model/factory_query_type';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const entityStoreRequestOptionsSchema = requestBasicOptionsSchema.extend({
  factoryQueryType: z.literal(EntityStoreQueries.entityStore),
});

export type EntityStoreRequestOptionsInput = z.input<typeof entityStoreRequestOptionsSchema>;

export type EntityStoreRequestOptions = z.infer<typeof entityStoreRequestOptionsSchema>;
