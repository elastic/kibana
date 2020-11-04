/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';

import { Service } from '../../../types';
import { TimeSeriesQuery, TimeSeriesQuerySchema } from '../lib/time_series_types';
export { TimeSeriesQuery, TimeSeriesResult } from '../lib/time_series_types';

export function createTimeSeriesQueryRoute(service: Service, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_time_series_query`;
  service.logger.debug(`registering indexThreshold route POST ${path}`);
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
    service.logger.debug(`route ${path} request: ${JSON.stringify(req.body)}`);

    const result = await service.indexThreshold.timeSeriesQuery({
      logger: service.logger,
      callCluster: ctx.core.elasticsearch.legacy.client.callAsCurrentUser,
      query: req.body,
    });

    service.logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}
