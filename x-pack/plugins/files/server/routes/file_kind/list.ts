/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { FileJSON, FileKind } from '../../../common/types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import type { CreateHandler, FileKindRouter } from './types';

export const method = 'get' as const;

const rt = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1 })),
    perPage: schema.maybe(schema.number({ defaultValue: 100 })),
    status: schema.maybe(schema.string()),
    name: schema.maybe(schema.string()),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<
  typeof rt,
  { files: Array<FileJSON<M>>; total: number }
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const {
    query: { page, perPage, status, name },
  } = req;
  const { fileService } = await files;
  const response = await fileService
    .asCurrentUser()
    .list({ fileKind, page, perPage, filter: { status, name } });
  const body: Endpoint['output'] = {
    total: response.total,
    files: response.files.map((result) => result.toJSON()),
  };
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
