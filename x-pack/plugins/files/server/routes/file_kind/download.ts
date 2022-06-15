/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Readable } from 'stream';

import { findFile } from './helpers';
import type { FileKindsRequestHandler } from './types';

export const paramsSchema = schema.object({
  fileId: schema.string(),
});
type Params = TypeOf<typeof paramsSchema>;

type Response = Readable;

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files: { fileService }, fileKind },
  req,
  res
) => {
  const {
    params: { fileId: id },
  } = req;
  const { error, result: file } = await findFile(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  const body: Response = await file.downloadContent();
  return res.ok({ body });
};
