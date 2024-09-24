/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { TransformIdParamSchema } from '../../api_schemas/common';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<TransformIdParamSchema, undefined, undefined> = async (
  ctx,
  req,
  res
) => {
  const { transformId } = req.params;
  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.getTransform({
      transform_id: transformId,
    });
    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
