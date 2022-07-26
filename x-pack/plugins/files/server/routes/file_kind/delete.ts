/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { DeleteFileKindHttpEndpoint } from '../../../common/api_routes';
import { fileErrors } from '../../file';
import type { FileKindsRequestHandler } from './types';

import { getById } from './helpers';

export const method = 'delete' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type Params = Ensure<DeleteFileKindHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = DeleteFileKindHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params> = async ({ files, fileKind }, req, res) => {
  const {
    params: { id },
  } = req;
  const { fileService } = await files;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.delete();
  } catch (e) {
    if (
      e instanceof fileErrors.AlreadyDeletedError ||
      e instanceof fileErrors.UploadInProgressError
    ) {
      return res.badRequest({ body: { message: e.message } });
    }
    return res.customError({
      statusCode: 500,
      body: {
        message:
          'Something went wrong while deleting the file. Check server logs for more details.',
      },
    });
  }
  const body: Response = {
    ok: true,
  };
  return res.ok({ body });
};
