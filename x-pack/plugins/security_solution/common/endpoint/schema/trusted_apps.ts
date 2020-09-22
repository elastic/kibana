/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const DeleteTrustedAppsRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
};

export const GetTrustedAppsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
  }),
};

export const PostTrustedAppCreateRequestSchema = {
  body: schema.object({
    name: schema.string({ minLength: 1 }),
    description: schema.maybe(schema.string({ minLength: 0, defaultValue: '' })),
    os: schema.oneOf([schema.literal('linux'), schema.literal('macos'), schema.literal('windows')]),
    entries: schema.arrayOf(
      schema.object({
        field: schema.oneOf([schema.literal('process.hash.*'), schema.literal('process.path')]),
        type: schema.literal('match'),
        operator: schema.literal('included'),
        value: schema.string({ minLength: 1 }),
      }),
      { minSize: 1 }
    ),
  }),
};
