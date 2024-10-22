/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowResponseSchemaV1 } from '../../../response';

export const findMaintenanceWindowsRequestQuerySchema = schema.object({
  page: schema.maybe(
    schema.number({
      defaultValue: 1,
      min: 1,
      meta: {
        description: 'The page number to return.',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      defaultValue: 10, // should it be 25? should I have max boundery as well
      min: 0,
      meta: {
        description: 'The number of rules to return per page.',
      },
    })
  ),
});

export const findMaintenanceWindowsResponseBodySchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(maintenanceWindowResponseSchemaV1),
});
