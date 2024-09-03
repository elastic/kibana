/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StopEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/generated/stop.gen';
import { StopEntityStoreRequestParams } from '../../../../../common/api/entity_analytics/entity_store/generated/stop.gen';
import { API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const stopEntityStoreRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/stop',
      options: {},
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: undefined,
            params: buildRouteValidationWithZod(StopEntityStoreRequestParams),
            body: undefined,
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<StopEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const body: StopEntityStoreResponse = undefined;

          return response.ok({ body });
        } catch (e) {
          logger.error('Error in StopEntityStore:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
