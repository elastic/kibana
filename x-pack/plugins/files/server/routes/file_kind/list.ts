/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { FileJSON, FileKind } from '../../../common/types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import * as cs from '../common_schemas';
import type { CreateHandler, FileKindRouter } from './types';
import {
  stringOrArrayOfStrings,
  nameStringOrArrayOfNameStrings,
  toArrayOrUndefined,
} from '../find';

export const method = 'post' as const;

const rt = {
  body: schema.object({
    status: schema.maybe(stringOrArrayOfStrings),
    extension: schema.maybe(stringOrArrayOfStrings),
    name: schema.maybe(nameStringOrArrayOfNameStrings),
    meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  }),
  query: schema.object({
    page: schema.maybe(cs.page),
    perPage: schema.maybe(cs.pageSize),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<
  typeof rt,
  { files: Array<FileJSON<M>>; total: number }
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const {
    body: { name, status, extension, meta },
    query: { page, perPage },
  } = req;
  const { fileService } = await files;
  const body: Endpoint['output'] = await fileService.asCurrentUser().find({
    kind: [fileKind],
    name: toArrayOrUndefined(name),
    status: toArrayOrUndefined(status),
    extension: toArrayOrUndefined(extension),
    page,
    perPage,
    meta,
  });
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.list) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getListRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.list.tags,
        },
      },
      handler
    );
  }
}
