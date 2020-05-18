/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertEvent } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from '../types';
import { AlertDetailsPagination } from './lib';
import { getHostData } from '../../metadata';
import { AlertId } from '../lib';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    try {
      const alertId = AlertId.fromEncoded(req.params.id);
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: alertId.index,
        id: alertId.id,
      })) as GetResponse<AlertEvent>;

      const indexPattern = await endpointAppContext.service
        .getIndexPatternRetriever()
        .getEventIndexPattern(ctx);

      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        response,
        indexPattern
      );

      const currentHostInfo = await getHostData(
        {
          endpointAppContext,
          requestHandlerContext: ctx,
        },
        response._source.host.id
      );

      return res.ok({
        body: {
          id: alertId.toString(),
          ...response._source,
          state: {
            host_metadata: currentHostInfo?.metadata,
          },
          next: await pagination.getNextUrl(),
          prev: await pagination.getPrevUrl(),
        },
      });
    } catch (err) {
      const logger = endpointAppContext.logFactory.get('alerts');
      logger.warn(err);

      if (err.status === 404) {
        return res.notFound({ body: err });
      }
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
