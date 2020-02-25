/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertData, EndpointAppConstants } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsPagination, AlertDetailsRequestParams } from './types';

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
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        id: alertId,
      })) as GetResponse<AlertData>;

      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        response
      );

      return res.ok({
        body: {
          id: response._id,
          ...response._source,
          next: await pagination.getNextUrl(),
          prev: await pagination.getPrevUrl(),
        },
      });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
