/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { HttpApiInterface } from '../../../common/api_routes';
import type { FileKindsRequestHandler } from './types';
import { getById } from './helpers';

import * as commonSchemas from './common_schemas';

export const method = 'patch' as const;

type UpdateEndpoint = HttpApiInterface['update'];

export const bodySchema = schema.object({
  name: schema.maybe(commonSchemas.fileName),
  alt: schema.maybe(commonSchemas.fileAlt),
  meta: schema.maybe(commonSchemas.fileMeta),
});

type Body = Ensure<UpdateEndpoint['inputs']['body'], TypeOf<typeof bodySchema>>;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type Params = TypeOf<typeof paramsSchema>;

type Response = UpdateEndpoint['output'];

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
  try {
    await file.update(attrs);
  } catch (e) {
    fileService.logger.error(e);
    return res.customError({
      statusCode: 500,
      body: {
        message:
          'Something went wrong while updating file attributes. Check server logs for more details.',
      },
    });
  }
  const body: Response = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};
