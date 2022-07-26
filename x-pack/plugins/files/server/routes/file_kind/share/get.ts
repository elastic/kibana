/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Ensure } from '@kbn/utility-types';
import { schema, TypeOf } from '@kbn/config-schema';

import { FileShareNotFoundError } from '../../../file_share_service/errors';
import type { FileGetShareHttpEndpoint } from '../../api_routes';
import { FileKindsRequestHandler } from '../types';

export const method = 'get' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type Params = Ensure<FileGetShareHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = FileGetShareHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, unknown, unknown> = async (
  { files },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    params: { id },
  } = req;

  try {
    const body: Response = { share: await fileService.asCurrentUser().getShareObject({ id }) };
    return res.ok({
      body,
    });
  } catch (e) {
    if (e instanceof FileShareNotFoundError) {
      return res.notFound({ body: e });
    }
    throw e;
  }
};
