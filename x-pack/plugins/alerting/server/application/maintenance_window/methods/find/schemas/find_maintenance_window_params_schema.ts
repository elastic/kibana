/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

//why everything is maybe here, but one level up we do not have any maybe
export const findMaintenanceWindowsParamsSchema = schema.object({
  perPage: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  search: schema.maybe((schema.string())),
  statuses: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('running'),
        schema.literal('finished'),
        schema.literal('upcoming'),
        schema.literal('archived'),
      ])
    )
  )
});
