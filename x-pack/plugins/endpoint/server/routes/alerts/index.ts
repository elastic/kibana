/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import { EndpointAppConstants } from '../../../common/types';
import { alertListGetHandlerWrapper, alertListUpdateHandlerWrapper } from './list';
import { alertDetailsGetHandlerWrapper, alertDetailsUpdateHandlerWrapper } from './details';
import {
  alertingIndexGetQuerySchema,
  alertingIndexPatchQuerySchema,
  alertingIndexPatchBodySchema,
  alertingIndexAlertDetailsParamsSchema,
} from '../../../common/schema/alert_index';

export const BASE_ALERTS_ROUTE = `${EndpointAppConstants.BASE_API_URL}/alerts`;

export function registerAlertRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  // Alert List
  router.get(
    {
      path: BASE_ALERTS_ROUTE,
      validate: {
        query: alertingIndexGetQuerySchema,
      },
      options: { authRequired: true },
    },
    alertListGetHandlerWrapper(endpointAppContext)
  );

  router.patch(
    {
      path: BASE_ALERTS_ROUTE,
      validate: {
        query: alertingIndexPatchQuerySchema,
        body: alertingIndexPatchBodySchema,
      },
      options: { authRequired: true },
    },
    alertListUpdateHandlerWrapper(endpointAppContext)
  );

  // Alert Details
  router.get(
    {
      path: `${BASE_ALERTS_ROUTE}/{id}`,
      validate: {
        params: alertingIndexAlertDetailsParamsSchema,
      },
      options: { authRequired: true },
    },
    alertDetailsGetHandlerWrapper(endpointAppContext)
  );

  router.patch(
    {
      path: `${BASE_ALERTS_ROUTE}/{id}`,
      validate: {
        params: alertingIndexAlertDetailsParamsSchema,
        body: alertingIndexPatchQuerySchema,
      },
      options: { authRequired: true },
    },
    alertDetailsUpdateHandlerWrapper(endpointAppContext)
  );
}
