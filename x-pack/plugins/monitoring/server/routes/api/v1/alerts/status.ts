/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { RouteDependencies } from '../../../../types';
import { fetchStatus } from '../../../../lib/alerts/fetch_status';
import { CommonAlertFilter } from '../../../../../common/types/alerts';

export function alertStatusRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alert/{clusterUuid}/status',
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        body: schema.object({
          alertTypeIds: schema.maybe(schema.arrayOf(schema.string())),
          filters: schema.maybe(schema.arrayOf(schema.any())),
          timeRange: schema.object({
            min: schema.number(),
            max: schema.number(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { clusterUuid } = request.params;
        const { alertTypeIds, filters } = request.body;
        const rulesClient = (await context.alerting)?.getRulesClient();
        if (!rulesClient) {
          return response.ok({ body: undefined });
        }

        const status = await fetchStatus(
          rulesClient,
          alertTypeIds,
          [clusterUuid],
          filters as CommonAlertFilter[]
        );
        return response.ok({ body: status });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
