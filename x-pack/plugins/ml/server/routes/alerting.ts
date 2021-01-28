/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import { alertingServiceProvider } from '../lib/alerts/alerting_service';
import { mlAnomalyThresholdAlertParams } from './schemas/alerting_schema';

export function alertingRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Alerting
   *
   * @api {post} /api/ml/alerting/preview Preview alerting condition
   * @apiName PreviewAlert
   * @apiDescription Returns a preview of the alerting condition
   */
  router.post(
    {
      path: '/api/ml/alerting/preview',
      validate: {
        body: mlAnomalyThresholdAlertParams,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const alertingService = alertingServiceProvider(mlClient);

        const result = await alertingService.preview(request.body);

        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
