/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Ensure } from '@kbn/utility-types';
import { Readable } from 'stream';

import type { File } from '../../../common';
import type { DownloadHttpEndpoint } from '../../../common/api_routes';

import { getById } from './helpers';
import type { FileKindsRequestHandler } from './types';

export const method = 'get' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
  fileName: schema.maybe(schema.string()),
});

type Params = Ensure<DownloadHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = Readable;

function getDownloadedFileName(file: File): string {
  // When creating a file we also calculate the extension so the `file.extension`
  // check is not really necessary except for type checking.
  if (file.mime && file.extension) {
    return `${file.name}.${file.extension}`;
  }
  return file.name;
}

export const handler: FileKindsRequestHandler<Params, unknown, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    params: { id, fileName },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  const body: Response = await file.downloadContent();
  return res.ok({
    body,
    headers: {
      'content-type': file.mime ?? 'application/octet-stream',
      // note, this name can be overridden by the client if set via a "download" attribute.
      'content-disposition': `attachment; filename="${fileName || getDownloadedFileName(file)}"`,
    },
  });
};
