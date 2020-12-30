/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';

/**
 * Routes for notification settings
 */
export function notificationRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup NotificationSettings
   *
   * @api {get} /api/ml/notification_settings Get notification settings
   * @apiName GetNotificationSettings
   * @apiDescription Returns cluster notification settings
   */
  router.get(
    {
      path: '/api/ml/notification_settings',
      validate: false,
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, response }) => {
      try {
        const { body } = await client.asCurrentUser.cluster.getSettings({
          include_defaults: true,
          filter_path: '**.xpack.notification',
        });

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
