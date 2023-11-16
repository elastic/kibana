/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { TransformIdParamSchema } from '../../../../common/api_schemas/common';
import type {
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../../common/api_schemas/transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  TransformIdParamSchema,
  undefined,
  PutTransformsRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  const { transformId } = req.params;

  const response: PutTransformsResponseSchema = {
    transformsCreated: [],
    errors: [],
  };

  const esClient = (await ctx.core).elasticsearch.client;

  try {
    const resp = await esClient.asCurrentUser.transform.putTransform({
      // @ts-expect-error @elastic/elasticsearch group_by is expected to be optional in TransformPivot
      body: req.body,
      transform_id: transformId,
    });

    if (resp.acknowledged) {
      response.transformsCreated.push({ transform: transformId });
    } else {
      response.errors.push({
        id: transformId,
        error: wrapEsError(resp),
      });
    }
  } catch (e) {
    response.errors.push({
      id: transformId,
      error: wrapEsError(e),
    });
  }

  return res.ok({ body: response });
};
