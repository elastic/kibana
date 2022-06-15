/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { FileKindsRequestHandler } from './types';

import { findFile } from './helpers';

export const paramsSchema = schema.object({
  fileId: schema.string(),
});
type Params = TypeOf<typeof paramsSchema>;

interface Response {
  ok: true;
}

export const handler: FileKindsRequestHandler<Params> = async (
  { files: { fileService }, fileKind },
  req,
  res
) => {
  const {
    params: { fileId: id },
  } = req;
  const { error, result: file } = await findFile(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.delete();
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
    ok: true,
  };
  return res.ok({ body });
};
