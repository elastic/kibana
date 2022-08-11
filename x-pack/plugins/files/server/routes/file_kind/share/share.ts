/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';

import { ExpiryDateInThePastError } from '../../../file_share_service/errors';
import { FileKindRouter, FileKindsRequestHandler } from '../types';

import { FileShareHttpEndpoint, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind } from '../../../../common/types';
import { getById } from '../helpers';

export const method = 'post' as const;

export const paramsSchema = schema.object({
  fileId: schema.string(),
});

const nameRegex = /^[a-z0-9-_]+$/i;

export const bodySchema = schema.object({
  validUntil: schema.maybe(schema.number()),
  name: schema.maybe(
    schema.string({
      maxLength: 256,
      validate: (v) =>
        nameRegex.test(v) ? undefined : 'Only alphanumeric, "-" and "_" characters are allowed.',
    })
  ),
});

type Body = Ensure<FileShareHttpEndpoint['inputs']['body'], TypeOf<typeof bodySchema>>;

type Params = Ensure<FileShareHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = FileShareHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    params: { fileId },
    body: { validUntil, name },
  } = req;

  const { error, result: file } = await getById(fileService.asCurrentUser(), fileId, fileKind);
  if (error) return error;

  try {
    const share = await file.share({ name, validUntil });
    const body: Response = {
      id: share.id,
      created: share.created,
      fileId: share.fileId,
      token: share.token,
      validUntil: share.validUntil,
      name: share.name,
    };
    return res.ok({
      body,
    });
  } catch (e) {
    if (e instanceof ExpiryDateInThePastError) {
      return res.badRequest({
        body: e,
      });
    }
    throw e;
  }
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getShareRoute(fileKind.id),
        validate: {
          params: paramsSchema,
          body: bodySchema,
        },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
