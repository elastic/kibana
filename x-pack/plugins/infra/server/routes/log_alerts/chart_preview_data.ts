/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
  getLogAlertsChartPreviewDataSuccessResponsePayloadRT,
  getLogAlertsChartPreviewDataRequestPayloadRT,
} from '../../../common/http_api/log_alerts/chart_preview_data';
import { createValidationFunction } from '../../../common/runtime_types';
import { getChartPreviewData } from '../../lib/alerting/log_threshold/log_threshold_chart_preview';

export const initGetLogAlertsChartPreviewDataRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
      validate: {
        body: createValidationFunction(getLogAlertsChartPreviewDataRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: { sourceId, buckets, alertParams },
      } = request.body;

      const sourceConfiguration = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId
      );

      try {
        const { series } = await getChartPreviewData(
          requestContext,
          sourceConfiguration,
          framework.callWithRequest,
          alertParams,
          buckets
        );

        return response.ok({
          body: getLogAlertsChartPreviewDataSuccessResponsePayloadRT.encode({
            data: { series },
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );
};
