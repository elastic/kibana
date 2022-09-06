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
import { getDownloadHeadersForFile } from '../common';
import { fileNameWithExt } from '../common_schemas';

const method = 'get' as const;

const querySchema = schema.object({
  token: schema.string(),
});

export const paramsSchema = schema.object({
  fileName: schema.maybe(fileNameWithExt),
});

type Query = Ensure<FilePublicDownloadHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Params = Ensure<
  FilePublicDownloadHttpEndpoint['inputs']['params'],
  TypeOf<typeof paramsSchema>
>;

type Response = FilePublicDownloadHttpEndpoint['output'];

const handler: FilesRequestHandler<Params, Query> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    query: { token },
    params: { fileName },
  } = req;

  try {
    const file = await fileService.asInternalUser().getByToken(token);
    const body: Response = await file.downloadContent();
    return res.ok({
      body,
      headers: getDownloadHeadersForFile(file, fileName),
    });
  } catch (e) {
    if (
      e instanceof FileNotFoundError ||
      e instanceof FileShareNotFoundError ||
      e instanceof FileShareTokenInvalidError
    ) {
      return res.badRequest({ body: { message: 'Invalid token' } });
    }
    if (e instanceof NoDownloadAvailableError) {
      return res.badRequest({
        body: { message: 'No download available. Try uploading content to the file first.' },
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
        params: paramsSchema,
      },
      options: {
        authRequired: false,
      },
    },
    handler
  );
}
