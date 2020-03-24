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
export function notificationRoutes({ router, mlLicense }: RouteInitialization) {
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
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const params = {
          includeDefaults: true,
          filterPath: '**.xpack.notification',
        };
        const resp = await context.ml!.mlClient.callAsCurrentUser('cluster.getSettings', params);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
