/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { Logger } from '../../../../../../src/core/server';
import { TimeSeriesQueryParameters } from '../lib/time_series_query';
import { TimeSeriesQuery, TimeSeriesQuerySchema, TimeSeriesResult } from '../lib/time_series_types';
export type { TimeSeriesQuery, TimeSeriesResult } from '../lib/time_series_types';

export function createTimeSeriesQueryRoute(
  logger: Logger,
  timeSeriesQuery: (params: TimeSeriesQueryParameters) => Promise<TimeSeriesResult>,
  router: IRouter,
  baseRoute: string
) {
  const path = `${baseRoute}/_time_series_query`;
  logger.debug(`registering indexThreshold route POST ${path}`);
  router.post(
    {
      path,
      validate: {
        body: TimeSeriesQuerySchema,
      },
    },
    handler
  );
  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, TimeSeriesQuery>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    logger.debug(`route ${path} request: ${JSON.stringify(req.body)}`);

    const result = await timeSeriesQuery({
      logger,
      esClient: ctx.core.elasticsearch.client.asCurrentUser,
      query: req.body,
    });

    logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}
