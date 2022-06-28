/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOG_VIEW_URL,
  putLogViewRequestParamsRT,
  putLogViewRequestPayloadRT,
  putLogViewResponsePayloadRT,
} from '../../../common/http_api/log_views';
import { createValidationFunction } from '../../../common/runtime_types';
import type { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import type { InfraPluginStartServicesAccessor } from '../../types';

export const initPutLogViewRoute = ({
  framework,
  getStartServices,
}: {
  framework: KibanaFramework;
  getStartServices: InfraPluginStartServicesAccessor;
}) => {
  framework.registerRoute(
    {
      method: 'put',
      path: LOG_VIEW_URL,
      validate: {
        params: createValidationFunction(putLogViewRequestParamsRT),
        body: createValidationFunction(putLogViewRequestPayloadRT),
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
          body: putLogViewResponsePayloadRT.encode({
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
