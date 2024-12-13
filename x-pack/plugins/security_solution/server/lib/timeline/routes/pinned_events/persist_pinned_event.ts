/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import type { SecuritySolutionPluginRouter } from '../../../../types';

import { PINNED_EVENT_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import {
  type PersistPinnedEventRouteResponse,
  PersistPinnedEventRouteRequestBody,
} from '../../../../../common/api/timeline';
import { persistPinnedEventOnTimeline } from '../../saved_object/pinned_events';

export const persistPinnedEventRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .patch({
      path: PINNED_EVENT_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithZod(PersistPinnedEventRouteRequestBody) },
        },
        version: '2023-10-31',
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PersistPinnedEventRouteResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { eventId } = request.body;
          const pinnedEventId = request.body?.pinnedEventId ?? null;
          const timelineId = request.body?.timelineId ?? null;

          const res = await persistPinnedEventOnTimeline(
            frameworkRequest,
            pinnedEventId,
            eventId,
            timelineId
          );

          return response.ok({
            body: {
              data: { persistPinnedEventOnTimeline: res },
            },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
