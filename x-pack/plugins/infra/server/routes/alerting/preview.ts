/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
// import Boom from 'boom';
import { createValidationFunction } from '../../../common/runtime_types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../lib/alerting/metric_threshold/types';
import { previewMetricThresholdAlert } from '../../lib/alerting/metric_threshold/preview_metric_threshold_alert';
import { InfraBackendLibs } from '../../lib/infra_types';

export const INFRA_ALERT_PREVIEW_PATH = '/api/infra/alerting/preview';

export const alertPreviewRequestParamsRT = rt.intersection([
  rt.partial({
    sourceId: rt.string,
    groupBy: rt.union([rt.string, rt.array(rt.string), rt.undefined]),
    filterQuery: rt.union([rt.string, rt.undefined]),
  }),
  rt.type({
    lookback: rt.union([rt.literal('h'), rt.literal('d'), rt.literal('w'), rt.literal('M')]),
    criteria: rt.array(rt.any),
    alertType: rt.literal(METRIC_THRESHOLD_ALERT_TYPE_ID),
  }),
]);

export const alertPreviewSuccessResponsePayloadRT = rt.type({
  numberOfGroups: rt.number,
  resultTotals: rt.type({
    fired: rt.number,
    noData: rt.number,
    error: rt.number,
  }),
});

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
      const { criteria, groupBy, filterQuery, lookback, sourceId } = request.body;

      const callCluster = (endpoint: string, opts: Record<string, any>) => {
        return callWithRequest(requestContext, endpoint, opts);
      };

      const source = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId || 'default'
      );

      try {
        const previewResult = await previewMetricThresholdAlert({
          callCluster,
          params: { criteria, groupBy, filterQuery },
          lookback,
          config: source.configuration,
        });

        const numberOfGroups = previewResult.length;
        const resultTotals = previewResult.reduce(
          (totals, groupResult) => {
            if (groupResult === null) return { ...totals, noData: totals.noData + 1 };
            if (groupResult === undefined) return { ...totals, error: totals.error + 1 };
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
      } catch (error) {
        // if (Boom.isBoom(error)) {
        //   throw error;
        // }

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
