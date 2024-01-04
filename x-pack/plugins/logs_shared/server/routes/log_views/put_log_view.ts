/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logViewsV1 } from '../../../common/http_api';
import { LOG_VIEW_URL } from '../../../common/http_api/log_views';
import { createValidationFunction } from '../../../common/runtime_types';
import { LogsSharedBackendLibs } from '../../lib/logs_shared_types';

export const initPutLogViewRoute = ({ framework, getStartServices }: LogsSharedBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'put',
      path: LOG_VIEW_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: createValidationFunction(logViewsV1.putLogViewRequestParamsRT),
            body: createValidationFunction(logViewsV1.putLogViewRequestPayloadRT),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { logViewId } = request.params;
        const { attributes } = request.body;
        const { logViews } = (await getStartServices())[2];
        const logViewsClient = logViews.getScopedClient(request);

        try {
          const logView = await logViewsClient.putLogView(logViewId, attributes);

          return response.ok({
            body: logViewsV1.putLogViewResponsePayloadRT.encode({
              data: logView,
            }),
          });
        } catch (error) {
          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: {
              message: error.message ?? 'An unexpected error occurred',
            },
          });
        }
      }
    );
};
