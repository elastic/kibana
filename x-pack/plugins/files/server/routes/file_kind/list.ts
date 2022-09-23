/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { ListFileKindHttpEndpoint } from '../../../common/api_routes';
import type { FileKind } from '../../../common/types';
import { FILES_API_ROUTES } from '../api_routes';
import type { FileKindRouter, FileKindsRequestHandler } from './types';

export const method = 'get' as const;

export const querySchema = schema.object({
  page: schema.maybe(schema.number({ defaultValue: 1 })),
  perPage: schema.maybe(schema.number({ defaultValue: 100 })),
});

type Query = Ensure<ListFileKindHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = ListFileKindHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<unknown, Query> = async (
  { files, fileKind },
  req,
  res
) => {
  const {
    query: { page, perPage },
  } = req;
  const { fileService } = await files;
  const response = await fileService.asCurrentUser().list({ fileKind, page, perPage });
  const body: Response = {
    files: response.map((result) => result.toJSON()),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.list) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getListRoute(fileKind.id),
        validate: {
          query: querySchema,
        },
        options: {
          tags: fileKind.http.list.tags,
        },
      },
      handler
    );
  }
}
