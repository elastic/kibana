/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertEvent } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from '../types';
import { AlertDetailsPagination } from './lib';
import { getHostData } from '../../metadata';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    const logger = endpointAppContext.logFactory.get('alerts');

    try {
      const indexPattern = await endpointAppContext.service
        .getIndexPatternRetriever()
        .getEventIndexPattern(ctx);

      const alertId = req.params.id;
      const results = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('search', {
        index: indexPattern,
        body: { query: { ids: { values: [alertId] } } },
      })) as SearchResponse<AlertEvent>;

      if (results.hits.hits.length === 0) {
        const errMsg = `Unable to find alert id: ${alertId}`;
        logger.info(errMsg);
        return res.notFound({ body: errMsg });
      }

      const alertResponse = results.hits.hits[0];

      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        alertResponse._source,
        indexPattern
      );

      const currentHostInfo = await getHostData(
        {
          endpointAppContext,
          requestHandlerContext: ctx,
        },
        alertResponse._source.host.id
      );

      return res.ok({
        body: {
          id: alertResponse._id,
          ...alertResponse._source,
          state: {
            host_metadata: currentHostInfo?.metadata,
          },
          next: await pagination.getNextUrl(),
          prev: await pagination.getPrevUrl(),
        },
      });
    } catch (err) {
      if (err.status === 404) {
        return res.notFound({ body: err });
      }
      logger.warn(err);
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
