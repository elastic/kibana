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
import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  // AIOPS_TELEMETRY_ID,
  AIOPS_API_PLUGIN_ID,
} from '@kbn/aiops-common/constants';
// import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
// import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { fetchSimpleLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_simple_log_rate_analysis';

// import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsApiLicense } from '../../types';

import type { AiopsLogRateAnalysisSchema } from './schema';

/**
 * Log rate analysis route handler.
 */
export function routeHandlerFactory(
  version: '1',
  license: AiopsApiLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema>,
    response: KibanaResponseFactory
  ) => {
    const { events } = request;

    // trackAIOpsRouteUsage(
    //   `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`,
    //   headers[AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN],
    //   usageCounter
    // );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    const client = (await context.core).elasticsearch.client.asCurrentUser;
    const executionContext = createExecutionContext(
      coreStart,
      AIOPS_API_PLUGIN_ID,
      request.route.path
    );

    const controller = new AbortController();
    const abortSignal = controller.signal;

    events.aborted$.subscribe(() => {
      controller.abort();
    });
    events.completed$.subscribe(() => {
      controller.abort();
    });

    const { index, timefield, start, end, keywordFieldCandidates, textFieldCandidates } =
      request.body;

    return await coreStart.executionContext.withContext(executionContext, async () => {
      const logRateAnalysis = await fetchSimpleLogRateAnalysis(
        client,
        index,
        start,
        end,
        timefield,
        abortSignal,
        keywordFieldCandidates,
        textFieldCandidates
      );

      return response.ok({
        body: logRateAnalysis,
      });
    });
  };
}
