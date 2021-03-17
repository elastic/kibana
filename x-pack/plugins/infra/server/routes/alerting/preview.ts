/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreviewResult } from '../../lib/alerting/common/types';
import {
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_ANOMALY_ALERT_TYPE_ID,
  INFRA_ALERT_PREVIEW_PATH,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
  alertPreviewRequestParamsRT,
  alertPreviewSuccessResponsePayloadRT,
  MetricThresholdAlertPreviewRequestParams,
  InventoryAlertPreviewRequestParams,
  MetricAnomalyAlertPreviewRequestParams,
} from '../../../common/alerting/metrics';
import { createValidationFunction } from '../../../common/runtime_types';
import { previewInventoryMetricThresholdAlert } from '../../lib/alerting/inventory_metric_threshold/preview_inventory_metric_threshold_alert';
import { previewMetricThresholdAlert } from '../../lib/alerting/metric_threshold/preview_metric_threshold_alert';
import { previewMetricAnomalyAlert } from '../../lib/alerting/metric_anomaly/preview_metric_anomaly_alert';
import { InfraBackendLibs } from '../../lib/infra_types';
import { assertHasInfraMlPlugins } from '../../utils/request_context';

export const initAlertPreviewRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: INFRA_ALERT_PREVIEW_PATH,
      validate: {
        body: createValidationFunction(alertPreviewRequestParamsRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        lookback,
        sourceId,
        alertType,
        alertInterval,
        alertThrottle,
        alertOnNoData,
        alertNotifyWhen,
      } = request.body;

      const esClient = requestContext.core.elasticsearch.client.asCurrentUser;

      const source = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId || 'default'
      );

      try {
        switch (alertType) {
          case METRIC_THRESHOLD_ALERT_TYPE_ID: {
            const {
              groupBy,
              criteria,
              filterQuery,
            } = request.body as MetricThresholdAlertPreviewRequestParams;
            const previewResult = await previewMetricThresholdAlert({
              esClient,
              params: { criteria, filterQuery, groupBy },
              lookback,
              config: source.configuration,
              alertInterval,
              alertThrottle,
              alertNotifyWhen,
              alertOnNoData,
            });

            const payload = processPreviewResults(previewResult);
            return response.ok({
              body: alertPreviewSuccessResponsePayloadRT.encode(payload),
            });
          }
          case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID: {
            const {
              nodeType,
              criteria,
              filterQuery,
            } = request.body as InventoryAlertPreviewRequestParams;
            const previewResult = await previewInventoryMetricThresholdAlert({
              esClient,
              params: { criteria, filterQuery, nodeType },
              lookback,
              source,
              alertInterval,
              alertThrottle,
              alertNotifyWhen,
              alertOnNoData,
            });

            const payload = processPreviewResults(previewResult);

            return response.ok({
              body: alertPreviewSuccessResponsePayloadRT.encode(payload),
            });
          }
          case METRIC_ANOMALY_ALERT_TYPE_ID: {
            assertHasInfraMlPlugins(requestContext);
            const {
              nodeType,
              metric,
              threshold,
              influencerFilter,
            } = request.body as MetricAnomalyAlertPreviewRequestParams;
            const { mlAnomalyDetectors, mlSystem, spaceId } = requestContext.infra;

            const previewResult = await previewMetricAnomalyAlert({
              mlAnomalyDetectors,
              mlSystem,
              spaceId,
              params: { nodeType, metric, threshold, influencerFilter },
              lookback,
              sourceId: source.id,
              alertInterval,
              alertThrottle,
              alertOnNoData,
              alertNotifyWhen,
            });

            return response.ok({
              body: alertPreviewSuccessResponsePayloadRT.encode({
                numberOfGroups: 1,
                resultTotals: {
                  ...previewResult,
                  error: 0,
                  noData: 0,
                },
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

const processPreviewResults = (previewResult: PreviewResult[]) => {
  const numberOfGroups = previewResult.length;
  const resultTotals = previewResult.reduce(
    (totals, { fired, warning, noData, error, notifications }) => {
      return {
        ...totals,
        fired: totals.fired + fired,
        warning: totals.warning + warning,
        noData: totals.noData + noData,
        error: totals.error + error,
        notifications: totals.notifications + notifications,
      };
    },
    {
      fired: 0,
      warning: 0,
      noData: 0,
      error: 0,
      notifications: 0,
    }
  );
  return { numberOfGroups, resultTotals };
};
