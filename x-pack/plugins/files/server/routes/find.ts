/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { FilesRouter } from './types';

import { FindFilesHttpEndpoint, FILES_API_ROUTES } from './api_routes';
import type { FilesRequestHandler } from './types';

const method = 'post' as const;

const string64 = schema.string({ maxLength: 64 });
const string256 = schema.string({ maxLength: 256 });

const stringOrArrayOfStrings = schema.oneOf([string64, schema.arrayOf(string64)]);
const nameStringOrArrayOfNameStrings = schema.oneOf([string256, schema.arrayOf(string256)]);

const bodySchema = schema.object({
  kind: schema.maybe(stringOrArrayOfStrings),
  status: schema.maybe(stringOrArrayOfStrings),
  name: schema.maybe(nameStringOrArrayOfNameStrings),
  meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

const querySchema = schema.object({
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number({ defaultValue: 100 })),
});

type Body = Ensure<FindFilesHttpEndpoint['inputs']['body'], TypeOf<typeof bodySchema>>;

type Query = Ensure<FindFilesHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = FindFilesHttpEndpoint['output'];

function toArray(val: string | string[]) {
  return Array.isArray(val) ? val : [val];
}

const handler: FilesRequestHandler<unknown, Query, Body> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    body: { meta, extension, kind, name, status },
    query,
  } = req;

  const body: Response = {
    files: await fileService.asCurrentUser().find({
      kind: kind && toArray(kind),
      name: name && toArray(name),
      status: status && toArray(status),
      extension: extension && toArray(extension),
      meta,
      ...query,
    }),
  };
  return res.ok({
    body,
  });
};

// TODO: Find out whether we want to add stricter access controls to this route.
// Currently this is giving read-access to all files which bypasses the
// security we set up on a per route level for the "getById" and "list" endpoints.
// Alternatively, we can remove the access controls on the "file kind" endpoints
// or remove them entirely.
export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.find,
      validate: {
        body: bodySchema,
      },
    },
    handler
  );
}
