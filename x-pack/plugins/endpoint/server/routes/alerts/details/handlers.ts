/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertEvent, EndpointAppConstants } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { getAlertSearchParams } from '../lib';
import { AlertRequestQuery, AlertDetailsRequestParams } from '../types';
import { AlertDetailsPagination } from './lib';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, AlertRequestQuery, unknown> {
  const alertDetailsHandler: RequestHandler<
    AlertDetailsRequestParams,
    AlertRequestQuery,
    unknown
  > = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, AlertRequestQuery, unknown>,
    res
  ) => {
    try {
      const alertId = req.params.id;
      const alertSearchParams = await getAlertSearchParams(req, endpointAppContext);

      // TODO: use correct index below
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        id: alertId,
      })) as GetResponse<AlertEvent>;

      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        ctx,
        alertSearchParams,
        response
      );

      return res.ok({
        body: {
          /*
          _id: response._id,
          _source: response._source,
          _paging: {
            next: await pagination.getNextUrl(),
            prev: await pagination.getPrevUrl(),
          },
          */
          id: response._id,
          ...response._source,
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
