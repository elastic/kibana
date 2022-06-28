/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import { Readable } from 'stream';
import type { HttpApiInterface } from '../../../common/api_routes';
import { getById } from './helpers';
import type { FileKindsRequestHandler } from './types';

export const method = 'put' as const;

type UploadEndpoint = HttpApiInterface['upload'];

export const bodySchema = schema.stream();
type Body = TypeOf<typeof bodySchema>;

export const paramsSchema = schema.object({
  id: schema.string(),
});
type Params = Ensure<UploadEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = UploadEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    body: stream,
    params: { id },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  await file.uploadContent(stream as Readable);
  const body: Response = { ok: true };
  return res.ok({ body });
};
