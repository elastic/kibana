/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { Ensure } from '@kbn/utility-types';

import type { FindFilesHttpEndpoint } from '../../common/api_routes';
import type { FilesRequestHandler } from './types';

export const method = 'post' as const;

const stringOrArrayOfStrings = schema.oneOf([schema.string(), schema.arrayOf(schema.string())]);

const paramsSchema = schema.object({
  kind: schema.maybe(stringOrArrayOfStrings),
  name: schema.maybe(stringOrArrayOfStrings),
  meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  mimeType: schema.maybe(stringOrArrayOfStrings),
  extension: schema.maybe(stringOrArrayOfStrings),
});

const querySchema = schema.object({
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number({ defaultValue: 100 })),
});

type Body = Ensure<FindFilesHttpEndpoint['inputs']['body'], TypeOf<typeof paramsSchema>>;

type Query = Ensure<FindFilesHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = FindFilesHttpEndpoint['output'];

export const handler: FilesRequestHandler<unknown, Query, Body> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const { body: reqBody, query } = req;
  const body: Response = {
    files: await fileService.asCurrentUser().find({
      ...reqBody,
      ...query,
    }),
  };
  return res.ok({
    body,
  });
};
