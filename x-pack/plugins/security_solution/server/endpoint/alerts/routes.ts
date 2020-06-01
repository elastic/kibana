/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { AlertConstants } from '../../../common/endpoint_alerts/alert_constants';
import { alertListHandlerWrapper } from './handlers/list';
import { alertDetailsHandlerWrapper } from './handlers/details';
import { alertDetailsReqSchema } from './handlers/details/schemas';
import { alertingIndexGetQuerySchema } from '../../../common/endpoint_alerts/schema/alert_index';
import { indexPatternGetParamsSchema } from '../../../common/endpoint_alerts/schema/index_pattern';
import { handleIndexPattern } from './handlers/index_pattern';

export const BASE_ALERTS_ROUTE = `${AlertConstants.BASE_API_URL}/alerts`;

export function registerAlertRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: BASE_ALERTS_ROUTE,
      validate: {
        query: alertingIndexGetQuerySchema,
      },
      options: { authRequired: true },
    },
    alertListHandlerWrapper(endpointAppContext)
  );

  router.get(
    {
      path: `${BASE_ALERTS_ROUTE}/{id}`,
      validate: {
        params: alertDetailsReqSchema,
      },
      options: { authRequired: true },
    },
    alertDetailsHandlerWrapper(endpointAppContext)
  );

  const log = endpointAppContext.logFactory.get('index_pattern');

  router.get(
    {
      path: `${AlertConstants.INDEX_PATTERN_ROUTE}/{datasetPath}`,
      validate: { params: indexPatternGetParamsSchema },
      options: { authRequired: true },
    },
    handleIndexPattern(log, endpointAppContext)
  );
}
