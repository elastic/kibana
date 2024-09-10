/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const GetUninstallTokensMetadataRequestSchema = {
  query: schema.object({
    policyId: schema.maybe(
      schema.string({
        maxLength: 50,
        meta: { description: 'Partial match filtering for policy IDs' },
      })
    ),
    search: schema.maybe(schema.string({ maxLength: 50 })),
    perPage: schema.maybe(
      schema.number({
        defaultValue: 20,
        min: 5,
        meta: { description: 'The number of items to return' },
      })
    ),
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
  }),
};

export const GetUninstallTokenRequestSchema = {
  params: schema.object({
    uninstallTokenId: schema.string(),
  }),
};
