/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { ScheduleNowTransformsRequestSchema } from '../../../../common/api_schemas/schedule_now_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { scheduleNowTransforms } from './schedule_now_transforms';

export const routeHandler: RequestHandler<
  undefined,
  undefined,
  ScheduleNowTransformsRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  const transformsInfo = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    return res.ok({
      body: await scheduleNowTransforms(transformsInfo, esClient.asCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
