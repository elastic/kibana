/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { ResetTransformsRequestSchema } from '../../../../common/api_schemas/reset_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { resetTransforms } from './reset_transforms';

export const routeHandler: RequestHandler<
  undefined,
  undefined,
  ResetTransformsRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  try {
    const body = await resetTransforms(req.body, ctx, res);

    if (body && body.status) {
      if (body.status === 404) {
        return res.notFound();
      }
      if (body.status === 403) {
        return res.forbidden();
      }
    }

    return res.ok({
      body,
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
