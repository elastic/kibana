/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  INFRA_ALERT_PREVIEW_PATH,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
  alertPreviewRequestParamsRT,
  alertPreviewSuccessResponsePayloadRT,
  MetricThresholdAlertPreviewRequestParams,
  InventoryAlertPreviewRequestParams,
} from '../../../common/alerting/metrics';
import { createValidationFunction } from '../../../common/runtime_types';
import { previewInventoryMetricThresholdAlert } from '../../lib/alerting/inventory_metric_threshold/preview_inventory_metric_threshold_alert';
import { previewMetricThresholdAlert } from '../../lib/alerting/metric_threshold/preview_metric_threshold_alert';
import { InfraBackendLibs } from '../../lib/infra_types';

export const initAlertPreviewRoute = ({ framework, sources }: InfraBackendLibs) => {
  const { callWithRequest } = framework;
  framework.registerRoute(
    {
      method: 'post',
      path: INFRA_ALERT_PREVIEW_PATH,
      validate: {
        body: createValidationFunction(alertPreviewRequestParamsRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { criteria, filterQuery, lookback, sourceId, alertType, alertInterval } = request.body;

      const callCluster = (endpoint: string, opts: Record<string, any>) => {
        return callWithRequest(requestContext, endpoint, opts);
      };

      const source = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId || 'default'
      );

      try {
        switch (alertType) {
          case METRIC_THRESHOLD_ALERT_TYPE_ID: {
            const { groupBy } = request.body as MetricThresholdAlertPreviewRequestParams;
            const previewResult = await previewMetricThresholdAlert({
              callCluster,
              params: { criteria, filterQuery, groupBy },
              lookback,
              config: source.configuration,
              alertInterval,
            });

            const numberOfGroups = previewResult.length;
            const resultTotals = previewResult.reduce(
              (totals, groupResult) => {
                if (groupResult === null) return { ...totals, noData: totals.noData + 1 };
                if (isNaN(groupResult)) return { ...totals, error: totals.error + 1 };
                return { ...totals, fired: totals.fired + groupResult };
              },
              {
                fired: 0,
                noData: 0,
                error: 0,
              }
            );

            return response.ok({
              body: alertPreviewSuccessResponsePayloadRT.encode({
                numberOfGroups,
                resultTotals,
              }),
            });
          }
          case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID: {
            const { nodeType } = request.body as InventoryAlertPreviewRequestParams;
            const previewResult = await previewInventoryMetricThresholdAlert({
              callCluster,
              params: { criteria, filterQuery, nodeType },
              lookback,
              config: source.configuration,
              alertInterval,
            });

            const numberOfGroups = previewResult.length;
            const resultTotals = previewResult.reduce(
              (totals, groupResult) => {
                if (groupResult === null) return { ...totals, noData: totals.noData + 1 };
                if (isNaN(groupResult)) return { ...totals, error: totals.error + 1 };
                return { ...totals, fired: totals.fired + groupResult };
              },
              {
                fired: 0,
                noData: 0,
                error: 0,
              }
            );

            return response.ok({
              body: alertPreviewSuccessResponsePayloadRT.encode({
                numberOfGroups,
                resultTotals,
              }),
            });
          }
          default:
            throw new Error('Unknown alert type');
        }
      } catch (error) {
        if (error.message.includes(TOO_MANY_BUCKETS_PREVIEW_EXCEPTION)) {
          return response.customError({
            statusCode: 508,
            body: {
              message: error.message.split(':')[1], // Extract the max buckets from the error message
            },
          });
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
