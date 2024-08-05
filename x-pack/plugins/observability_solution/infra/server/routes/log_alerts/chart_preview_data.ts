/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { logAlertsV1 } from '../../../common/http_api';
import { InfraBackendLibs } from '../../lib/infra_types';

import { getChartPreviewData } from '../../lib/alerting/log_threshold/log_threshold_chart_preview';

export const initGetLogAlertsChartPreviewDataRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  if (!framework.config.featureFlags.logThresholdAlertRuleEnabled) {
    return;
  }

  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAlertsV1.LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(
              logAlertsV1.getLogAlertsChartPreviewDataRequestPayloadRT
            ),
          },
        },
      },
      framework.router.handleLegacyErrors(async (requestContext, request, response) => {
        const {
          data: { logView, buckets, alertParams, executionTimeRange },
        } = request.body;

        const [, { logsShared }] = await getStartServices();
        const resolvedLogView = await logsShared.logViews
          .getScopedClient(request)
          .getResolvedLogView(logView);

        try {
          const { series } = await getChartPreviewData(
            requestContext,
            resolvedLogView,
            framework.callWithRequest,
            alertParams,
            buckets,
            executionTimeRange
          );

          return response.ok({
            body: logAlertsV1.getLogAlertsChartPreviewDataSuccessResponsePayloadRT.encode({
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
