/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { RequestHandler } from '@kbn/core/server';

import { type GetTransformStatsQuerySchema } from '../../../../common/api_schemas/transforms_stats';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  estypes.TransformGetTransformStatsResponse,
  GetTransformStatsQuerySchema,
  undefined,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  try {
    const basic = req.query.basic ?? false;

    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.getTransformStats(
      {
        size: 1000,
        transform_id: '_all',
        // @ts-expect-error `basic` query option not yet in @elastic/elasticsearch
        basic,
      },
      { maxRetries: 0 }
    );
    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
