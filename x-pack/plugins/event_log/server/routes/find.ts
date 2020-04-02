/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { BASE_EVENT_LOG_API_PATH } from '../../common';
import { FindOptionsSchema, FindOptionsType } from '../event_log_client';
import { routeValidatorByType } from '../lib/route_validator_by_type';

const ParamsSchema = t.type({
  type: t.string,
  id: t.string,
});
type ParamsType = t.TypeOf<typeof ParamsSchema>;

export const findRoute = (router: IRouter) => {
  router.get(
    {
      path: `${BASE_EVENT_LOG_API_PATH}/{type}/{id}/_find`,
      validate: {
        params: routeValidatorByType(ParamsSchema),
        query: routeValidatorByType(FindOptionsSchema),
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<ParamsType, FindOptionsType, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      if (!context.eventLog) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for eventLog' });
      }
      const eventLogClient = context.eventLog.getEventLogClient();
      const {
        params: { id, type },
        query,
      } = req;
      return res.ok({
        body: await eventLogClient.findEventsBySavedObject(type, id, query),
      });
    })
  );
};
