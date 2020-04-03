/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertEvent, EndpointAppConstants } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from '../types';
import { AlertDetailsPagination } from './lib';
import { IngestIndexPatternRetriever } from '../../../index_pattern';
import { getHostData } from '../../../routes/metadata';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    try {
      const alertId = req.params.id;
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        // Remove the hard coded reference to an alert index here
        // https://github.com/elastic/endpoint-app-team/issues/311
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        id: alertId,
      })) as GetResponse<AlertEvent>;

      const indexPatternRetriever = new IngestIndexPatternRetriever(
        endpointAppContext.ingestManager.indexPatternService,
        ctx.core.savedObjects.client,
        EndpointAppConstants.EVENT_DATASET,
        endpointAppContext.logFactory.get('alerts')
      );

      const indexPattern = await indexPatternRetriever.get();
      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        response,
        indexPattern
      );

      const currentHostInfo = await getHostData(ctx, response._source.host.id, indexPattern);

      return res.ok({
        body: {
          // base64 encode the index in the response
          // https://github.com/elastic/endpoint-app-team/issues/311
          id: response._id,
          ...response._source,
          state: {
            host_metadata: currentHostInfo,
          },
          next: await pagination.getNextUrl(),
          prev: await pagination.getPrevUrl(),
        },
      });
    } catch (err) {
      if (err.status === 404) {
        return res.notFound({ body: err });
      }
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
