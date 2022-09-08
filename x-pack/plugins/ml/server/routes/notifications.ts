/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotificationsService } from '../models/notifications_service';
import {
  getNotificationsCountQuerySchema,
  getNotificationsQuerySchema,
} from './schemas/notifications_schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';

export function notificationsRoutes({ router, routeGuard }: RouteInitialization) {
  router.get(
    {
      path: '/api/ml/notifications',
      validate: {
        query: getNotificationsQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetAnnotations'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const notificationsService = new NotificationsService(client, mlClient);

        const results = await notificationsService.searchMessages(request.query);

        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.get(
    {
      path: '/api/ml/notifications/count',
      validate: {
        query: getNotificationsCountQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetAnnotations'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const notificationsService = new NotificationsService(client, mlClient);

        const results = await notificationsService.countMessages(request.query);

        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
