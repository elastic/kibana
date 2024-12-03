/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowResponseSchemaV1 } from '../../../response';

const MAX_DOCS = 10000;

export const findMaintenanceWindowsRequestQuerySchema = schema.object(
  {
    // we do not need to use schema.maybe here, because if we do not pass property page, defaultValue will be used
    page: schema.number({
      defaultValue: 1,
      min: 1,
      max: MAX_DOCS,
      meta: {
        description: 'The page number to return.',
      },
    }),
    // we do not need to use schema.maybe here, because if we do not pass property per_page, defaultValue will be used
    per_page: schema.number({
      defaultValue: 1000,
      min: 0,
      max: 100,
      meta: {
        description: 'The number of maintenance windows to return per page.',
      },
    }),
    search: schema.string({
      defaultValue: '',
      meta: {
        description: 'The search query string for filtering results.',
      },
    }),
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
  },
  {
    validate: (params) => {
      const pageAsNumber = params.page ?? 0;
      const perPageAsNumber = params.per_page ?? 0;

      if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > MAX_DOCS) {
        return `The number of documents is too high. Paginating through more than ${MAX_DOCS} documents is not possible.`;
      }
    },
  }
);

export const findMaintenanceWindowsResponseBodySchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(maintenanceWindowResponseSchemaV1),
});
