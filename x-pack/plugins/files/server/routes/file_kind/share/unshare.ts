/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { CreateRouteDefinition, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind } from '../../../../common/types';
import { CreateHandler, FileKindRouter } from '../types';
import { FileShareNotFoundError } from '../../../file_share_service/errors';

export const method = 'delete' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, { ok: true }>;

export const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id },
  } = req;

  try {
    await fileService.asCurrentUser().deleteShareObject({ id });
  } catch (e) {
    if (e instanceof FileShareNotFoundError) {
      return res.notFound({ body: { message: e.message } });
    }
    throw e;
  }

  const body: Endpoint['output'] = {
    ok: true,
  };
  return res.ok({
    body,
  });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getUnshareRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
