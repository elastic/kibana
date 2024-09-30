/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  scheduleNowTransformsRequestSchema,
  type ScheduleNowTransformsRequestSchema,
} from '../../api_schemas/schedule_now_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/schedule_now_transforms Schedules transforms now
   * @apiName PostScheduleNowTransforms
   * @apiDescription Schedules transforms now
   *
   * @apiSchema (body) scheduleNowTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('schedule_now_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, ScheduleNowTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: scheduleNowTransformsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<undefined, undefined, ScheduleNowTransformsRequestSchema>(
          routeHandler
        )(ctx, request, response);
      }
    );
}
