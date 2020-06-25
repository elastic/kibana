/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { alertsIndexPattern } from '../../../../../common/endpoint/constants';
import { EndpointAppContext } from '../../../types';
import { searchESForAlerts } from '../lib';
import { getRequestData, mapToAlertResultList } from './lib';
import { AlertingIndexGetQueryResult } from '../../../../../common/endpoint_alerts/types';

export const alertListHandlerWrapper = function (
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> {
  const alertListHandler: RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> = async (
    ctx,
    req,
    res
  ) => {
    try {
      const reqData = await getRequestData(req, endpointAppContext);
      const response = await searchESForAlerts(
        ctx.core.elasticsearch.legacy.client,
        reqData,
        alertsIndexPattern
      );
      const mappedBody = await mapToAlertResultList(ctx, endpointAppContext, reqData, response);
      return res.ok({ body: mappedBody });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};
