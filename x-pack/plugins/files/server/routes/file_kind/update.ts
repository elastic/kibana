/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ensure } from '@kbn/utility-types';
import { schema, TypeOf } from '@kbn/config-schema';
import type { FileKind } from '../../../common/types';
import type { UpdateFileKindHttpEndpoint } from '../../../common/api_routes';
import type { FileKindRouter, FileKindsRequestHandler } from './types';
import { FILES_API_ROUTES } from '../api_routes';
import { getById } from './helpers';

import * as commonSchemas from '../common_schemas';

export const method = 'patch' as const;

export const bodySchema = schema.object({
  name: schema.maybe(commonSchemas.fileName),
  alt: schema.maybe(commonSchemas.fileAlt),
  meta: schema.maybe(commonSchemas.fileMeta),
});

type Body = Ensure<UpdateFileKindHttpEndpoint['inputs']['body'], TypeOf<typeof bodySchema>>;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type Params = Ensure<UpdateFileKindHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = UpdateFileKindHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    params: { id },
    body: attrs,
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  await file.update(attrs);
  const body: Response = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.update) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getUpdateRoute(fileKind.id),
        validate: {
          body: bodySchema,
          params: paramsSchema,
        },
        options: {
          tags: fileKind.http.update.tags,
        },
      },
      handler
    );
  }
}
