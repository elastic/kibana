/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { EndpointAppContext } from '../../../types';
import { searchESForAlerts } from '../lib';
import { getRequestData, mapToAlertResultList } from './lib';
import { AlertListRequestQuery } from '../types';

export const alertListHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertListRequestQuery, unknown> {
  const alertListHandler: RequestHandler<unknown, AlertListRequestQuery, unknown> = async (
    ctx,
    req: KibanaRequest<unknown, AlertListRequestQuery, unknown>,
    res
  ) => {
    try {
      const reqData = await getRequestData(req, endpointAppContext);
      const response = await searchESForAlerts(ctx.core.elasticsearch.dataClient, reqData);
      const mappedBody = await mapToAlertResultList(ctx, endpointAppContext, reqData, response);
      return res.ok({ body: mappedBody });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};
