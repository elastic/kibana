/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Ensure } from '@kbn/utility-types';
import type { CreateFileKindHttpEndpoint } from '../../../common/api_routes';
import type { FileKind } from '../../../common/types';
import { FILES_API_ROUTES } from '../api_routes';
import type { FileKindRouter, FileKindsRequestHandler } from './types';
import * as commonSchemas from '../common_schemas';

export const method = 'post' as const;

export const bodySchema = schema.object({
  name: commonSchemas.fileName,
  alt: commonSchemas.fileAlt,
  meta: commonSchemas.fileMeta,
  mimeType: schema.maybe(schema.string()),
});

type Body = Ensure<CreateFileKindHttpEndpoint['inputs']['body'], TypeOf<typeof bodySchema>>;

type Response = CreateFileKindHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<unknown, unknown, Body> = async (
  { fileKind, files },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    body: { name, alt, meta, mimeType },
  } = req;
  const file = await fileService
    .asCurrentUser()
    .create({ fileKind, name, alt, meta, mime: mimeType });
  const body: Response = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.create) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getCreateFileRoute(fileKind.id),
        validate: {
          body: bodySchema,
        },
        options: {
          tags: fileKind.http.create.tags,
        },
      },
      handler
    );
  }
}
