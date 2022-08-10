/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';

import { FileListSharesHttpEndpoint, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind } from '../../../../common/types';
import { FileKindRouter, FileKindsRequestHandler } from '../types';

export const method = 'get' as const;

export const querySchema = schema.object({
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  forFileId: schema.maybe(schema.string()),
});

type Query = Ensure<FileListSharesHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = FileListSharesHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<unknown, Query, unknown> = async (
  { files },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    query: { forFileId, page, perPage },
  } = req;

  const result = await fileService
    .asCurrentUser()
    .listShareObjects({ fileId: forFileId, page, perPage });

  const body: Response = result;
  return res.ok({
    body,
  });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getListShareRoute(fileKind.id),
        validate: {
          query: querySchema,
        },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
