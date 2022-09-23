/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { CreateHandler, FilesRouter } from './types';
import { FileJSON } from '../../common';
import { FILES_API_ROUTES, CreateRouteDefinition } from './api_routes';

const method = 'post' as const;

const string64 = schema.string({ maxLength: 64 });
const string256 = schema.string({ maxLength: 256 });

const stringOrArrayOfStrings = schema.oneOf([string64, schema.arrayOf(string64)]);
const nameStringOrArrayOfNameStrings = schema.oneOf([string256, schema.arrayOf(string256)]);

const rt = {
  body: schema.object({
    kind: schema.maybe(stringOrArrayOfStrings),
    status: schema.maybe(stringOrArrayOfStrings),
    extension: schema.maybe(stringOrArrayOfStrings),
    name: schema.maybe(nameStringOrArrayOfNameStrings),
    meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  }),
  query: schema.object({
    page: schema.maybe(schema.number()),
    perPage: schema.maybe(schema.number({ defaultValue: 100 })),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, { files: FileJSON[] }>;

function toArray(val: string | string[]) {
  return Array.isArray(val) ? val : [val];
}

const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    body: { meta, extension, kind, name, status },
    query,
  } = req;

  const body: Endpoint['output'] = {
    files: await fileService.asCurrentUser().find({
      kind: kind ? toArray(kind) : undefined,
      name: name ? toArray(name) : undefined,
      status: status ? toArray(status) : undefined,
      extension: extension ? toArray(extension) : undefined,
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
      validate: { ...rt },
    },
    handler
  );
}
