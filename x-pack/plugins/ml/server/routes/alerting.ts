/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import { alertingServiceProvider } from '../lib/alerts/alerting_service';
import { mlAnomalyDetectionAlertPreviewRequest } from './schemas/alerting_schema';
import { datafeedsProvider } from '../models/job_service/datafeeds';

export function alertingRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Alerting
   *
   * @api {post} /api/ml/alerting/preview Preview alerting condition
   * @apiName PreviewAlert
   * @apiDescription Returns a preview of the alerting condition
   *
   * @apiSchema (body) mlAnomalyDetectionAlertPreviewRequest
   */
  router.post(
    {
      path: '/api/ml/alerting/preview',
      validate: {
        body: mlAnomalyDetectionAlertPreviewRequest,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response, client }) => {
      try {
        const alertingService = alertingServiceProvider(
          mlClient,
          datafeedsProvider(client, mlClient)
        );

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
