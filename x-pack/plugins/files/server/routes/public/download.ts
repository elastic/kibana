/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Ensure } from '@kbn/utility-types';
import { schema, TypeOf } from '@kbn/config-schema';

import { NoDownloadAvailableError } from '../../file/errors';
import { FileNotFoundError } from '../../file_service/errors';
import {
  FileShareNotFoundError,
  FileShareTokenInvalidError,
} from '../../file_share_service/errors';
import type { FilesRouter, FilesRequestHandler } from '../types';
import { FilePublicDownloadHttpEndpoint, FILES_API_ROUTES } from '../api_routes';

const method = 'get' as const;

const querySchema = schema.object({
  token: schema.string(),
});

type Query = Ensure<FilePublicDownloadHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = FilePublicDownloadHttpEndpoint['output'];

const handler: FilesRequestHandler<unknown, Query> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    query: { token },
  } = req;

  try {
    const file = await fileService.asInternalUser().getByToken(token);
    const body: Response = await file.downloadContent();
    return res.ok({
      body,
    });
  } catch (e) {
    if (
      e instanceof FileNotFoundError ||
      e instanceof FileShareNotFoundError ||
      e instanceof FileShareTokenInvalidError
    ) {
      return res.badRequest({ body: 'Invalid token' });
    }
    if (e instanceof NoDownloadAvailableError) {
      return res.badRequest({
        body: 'No download available. Try uploading content to the file first.',
      });
    }

    throw e;
  }
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.public.download,
      validate: {
        query: querySchema,
      },
      options: {
        authRequired: false,
      },
    },
    handler
  );
}
