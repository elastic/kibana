/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import Boom from 'boom';
import { createValidationFunction } from '../../../common/runtime_types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../lib/alerting/metric_threshold/types';
import { previewMetricThresholdAlert } from '../../lib/alerting/metric_threshold/preview_metric_threshold_alert';
import { InfraBackendLibs } from '../../lib/infra_types';

const alertPreviewRequestParamsRT = rt.intersection([
  rt.partial({
    sourceId: rt.string,
  }),
  rt.type({
    lookback: rt.union([rt.literal('h'), rt.literal('d'), rt.literal('w'), rt.literal('m')]),
    params: rt.type({
      groupBy: rt.union([rt.string, rt.array(rt.string), rt.undefined]),
      filterQuery: rt.union([rt.string, rt.undefined]),
      criteria: rt.array(rt.any),
    }),
    alertType: rt.literal(METRIC_THRESHOLD_ALERT_TYPE_ID),
  }),
]);

const alertPreviewSuccessResponsePayloadRT = rt.type({
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
      method: 'get',
      path: '/api/infra/alerting/preview',
      validate: {
        params: createValidationFunction(alertPreviewRequestParamsRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { params, lookback, sourceId } = request.params;

      const callCluster = (endpoint: string, { body, ...opts }: Record<string, any>) =>
        callWithRequest(requestContext, endpoint, { query: { body }, ...opts });

      const source = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId || 'default'
      );

      try {
        const previewResult = await previewMetricThresholdAlert({
          callCluster,
          params,
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
