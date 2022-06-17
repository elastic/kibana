/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { FileJSON } from '../../../common/types';
import type { FileKindsRequestHandler } from './types';
import { findFile } from './helpers';

export const method = 'patch' as const;

export const bodySchema = schema.object({
  name: schema.maybe(schema.string()),
  alt: schema.maybe(schema.string()),
  meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

type Body = TypeOf<typeof bodySchema>;

export const paramsSchema = schema.object({
  fileId: schema.string(),
});
type Params = TypeOf<typeof paramsSchema>;

interface Response {
  file: FileJSON;
}

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    params: { fileId: id },
    body: attrs,
  } = req;
  const { error, result: file } = await findFile(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.update(attrs);
  } catch (e) {
    return res.customError({
      statusCode: 500,
      body: {
        message:
          'Something went wrong while update file attributes. Check server logs for more details.',
      },
    });
  }
  const body: Response = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};
