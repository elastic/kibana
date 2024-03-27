/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
// import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
// import { AIOPS_TELEMETRY_ID, AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
// import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
// import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

// import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsApiLicense } from '../../types';

/**
 * The log rate analysis route handler sets up `responseStreamFactory`
 * to create the response stream and then uses its handlers to
 * walk through the steps of the analysis.
 */
export function routeHandlerFactory<T extends ApiVersion>(
  version: T,
  license: AiopsApiLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema<T>> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema<T>>,
    response: KibanaResponseFactory
  ) => {
    // const { headers } = request;

    // trackAIOpsRouteUsage(
    //   `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`,
    //   headers[AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN],
    //   usageCounter
    // );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    // const client = (await context.core).elasticsearch.client.asCurrentUser;
    // const executionContext = createExecutionContext(coreStart, AIOPS_PLUGIN_ID, request.route.path);

    return response.ok({
      body: {
        time: new Date().toISOString(),
      },
    });
  };
}
