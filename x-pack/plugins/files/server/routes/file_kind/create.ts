/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { FileJSON, FileKind } from '../../../common/types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import type { FileKindRouter } from './types';
import * as commonSchemas from '../common_schemas';
import { CreateHandler } from './types';

export const method = 'post' as const;

const rt = {
  body: schema.object({
    name: commonSchemas.fileName,
    alt: commonSchemas.fileAlt,
    meta: commonSchemas.fileMeta,
    mimeType: schema.maybe(schema.string()),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<typeof rt, { file: FileJSON<M> }>;

export const handler: CreateHandler<Endpoint> = async ({ fileKind, files }, req, res) => {
  const { fileService } = await files;
  const {
    body: { name, alt, meta, mimeType },
  } = req;
  const file = await fileService
    .asCurrentUser()
    .create({ fileKind, name, alt, meta, mime: mimeType });
  const body: Endpoint['output'] = {
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
          ...rt,
        },
        options: {
          tags: fileKind.http.create.tags,
        },
      },
      handler
    );
  }
}
