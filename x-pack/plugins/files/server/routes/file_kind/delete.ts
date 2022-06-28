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

export const method = 'delete' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
});

type DeleteInterface = HttpApiInterface['delete'];

type Params = Ensure<DeleteInterface['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = DeleteInterface['output'];

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
