/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { TransformIdParamSchema } from '../../../../common/api_schemas/common';
import type { PostTransformsUpdateRequestSchema } from '../../../../common/api_schemas/update_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  TransformIdParamSchema,
  undefined,
  PostTransformsUpdateRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  const { transformId } = req.params;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.updateTransform({
      // @ts-expect-error query doesn't satisfy QueryDslQueryContainer from @elastic/elasticsearch
      body: req.body,
      transform_id: transformId,
    });
    return res.ok({
      body,
    });
  } catch (e) {
    return res.customError(wrapError(e));
  }
};
