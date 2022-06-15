/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Readable } from 'stream';

import { File } from '../../../common/types';
import type { FileKindsRequestHandler } from './types';

export const bodySchema = schema.stream();
type Body = TypeOf<typeof bodySchema>;

export const paramsSchema = schema.object({
  fileId: schema.string(),
});
type Params = TypeOf<typeof paramsSchema>;

interface Response {
  ok: true;
}

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files: { fileServiceFactory, uploadEndpoint }, fileKind },
  req,
  res
) => {
  const {
    body: stream,
    params: { fileId: id },
  } = req;
  const fileService = fileServiceFactory.asScoped(req);
  let file: File;
  try {
    file = await fileService.find({ fileKind, id });
  } catch (e) {
    return res.notFound({ body: { message: `File ${id} not found` } });
  }
  await file.uploadContent(stream as Readable);
  const body: Response = { ok: true };
  return res.ok({ body });
};
