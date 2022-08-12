/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';

import { FILES_API_ROUTES, FileUnshareHttpEndpoint } from '../../api_routes';
import type { FileKind } from '../../../../common/types';
import { FileKindRouter, FileKindsRequestHandler } from '../types';
import { FileShareNotFoundError } from '../../../file_share_service/errors';

export const method = 'delete' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type Params = Ensure<FileUnshareHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = FileUnshareHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files },
  req,
  res
) => {
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

  const body: Response = {
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
        validate: {
          params: paramsSchema,
        },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
