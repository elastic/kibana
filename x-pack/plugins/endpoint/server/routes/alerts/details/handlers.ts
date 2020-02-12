/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { AlertData, AlertDataWrapper } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from './types';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    try {
      function mapHit(entry: AlertDataWrapper): AlertData {
        return {
          id: entry._id,
          ...entry._source,
        };
      }

      const alertId = req.params.id;
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: 'my-index',
        id: alertId,
      })) as SearchResponse<unknown>;

      return res.ok({ body: mapHit((response as unknown) as AlertDataWrapper) });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
