/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { NotificationsService } from '../models/notifications_service';
import {
  getNotificationsCountQuerySchema,
  getNotificationsQuerySchema,
} from './schemas/notifications_schema';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';

export function notificationsRoutes({
  router,
  routeGuard,
  getEnabledFeatures,
}: RouteInitialization) {
  /**
   * @apiGroup Notifications
   *
   * @api {get} /internal/ml/notifications Get notifications
   * @apiName GetNotifications
   * @apiDescription Retrieves notifications based on provided criteria.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/notifications`,
      access: 'internal',
      options: {
        tags: [
          'access:ml:canGetJobs',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetTrainedModels',
        ],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: getNotificationsQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, request, response, mlSavedObjectService }) => {
          try {
            const notificationsService = new NotificationsService(
              client,
              mlSavedObjectService,
              getEnabledFeatures()
            );

            const results = await notificationsService.searchMessages(request.query);

            return response.ok({
              body: results,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup Notifications
   *
   * @api {get} /internal/ml/notifications/count Get notification counts
   * @apiName GetNotificationCounts
   * @apiDescription Counts notifications by level.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/notifications/count`,
      access: 'internal',
      options: {
        tags: [
          'access:ml:canGetJobs',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetTrainedModels',
        ],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: getNotificationsCountQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlSavedObjectService, request, response }) => {
          try {
            const notificationsService = new NotificationsService(
              client,
              mlSavedObjectService,
              getEnabledFeatures()
            );

            const results = await notificationsService.countMessages(request.query);

            return response.ok({
              body: results,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );
}
