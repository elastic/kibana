/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { GetByIdFileKindHttpEndpoint } from '../../../common/api_routes';
import { getById } from './helpers';
import type { FileKindsRequestHandler } from './types';

type Response = GetByIdFileKindHttpEndpoint['output'];

export const method = 'get' as const;

export const paramsSchema = schema.object({
  id: schema.string(),
});
type Params = Ensure<GetByIdFileKindHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

export const handler: FileKindsRequestHandler<Params> = async ({ files, fileKind }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  const body: Response = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};
