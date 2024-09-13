/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import type { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import { mlAnomalyDetectionAlertPreviewRequest } from './schemas/alerting_schema';
import type { SharedServices } from '../shared_services';

export function alertingRoutes(
  { router, routeGuard }: RouteInitialization,
  sharedServicesProviders: SharedServices
) {
  /**
   * @apiGroup Alerting
   */
  router.versioned
    .post({
      access: 'internal',
      path: `${ML_INTERNAL_BASE_PATH}/alerting/preview`,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
      summary: 'Previews an alerting condition',
      description: 'Returns a preview of the alerting condition',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: mlAnomalyDetectionAlertPreviewRequest,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response, client, context }) => {
        try {
          const alertingService = sharedServicesProviders.alertingServiceProvider(
            (await context.core).savedObjects.client,
            request
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
