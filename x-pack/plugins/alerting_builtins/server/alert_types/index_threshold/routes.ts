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

import { Service } from '../../types';
import { TimeSeriesQuery, TimeSeriesQuerySchema, TimeSeriesResult } from './lib/time_series_types';
export { TimeSeriesQuery, TimeSeriesResult } from './lib/time_series_types';

export function createTimeSeriesQueryRoute(service: Service, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_time_series_query`;
  service.logger.debug(`registering indexThreshold timeSeriesQuery route POST ${path}`);
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
    req: KibanaRequest<any, any, TimeSeriesQuery, any>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    service.logger.debug(`route query_data request: ${JSON.stringify(req.body, null, 4)}`);

    let result: TimeSeriesResult;
    try {
      result = await service.indexThreshold.timeSeriesQuery({
        logger: service.logger,
        callCluster: ctx.core.elasticsearch.dataClient.callAsCurrentUser,
        query: req.body,
      });
    } catch (err) {
      service.logger.debug(`route query_data error: ${err.message}`);
      return res.internalError({ body: 'error running time series query' });
    }

    service.logger.debug(`route query_data response: ${JSON.stringify(result, null, 4)}`);
    return res.ok({ body: result });
  }
}
