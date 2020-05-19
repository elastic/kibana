/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { RouteDependencies } from '../../../../types';
import { fetchStatus } from '../../../../lib/alerts/fetch_status';
import { CommonAlertFilter } from '../../../../../common/types';

export function alertStatusRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alert/{clusterUuid}/status',
      options: { tags: ['access:monitoring'] },
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        body: schema.object({
          alertTypeIds: schema.arrayOf(schema.string()),
          filters: schema.maybe(schema.arrayOf(schema.any())),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { clusterUuid } = request.params;
        const {
          alertTypeIds,
          timeRange: { min, max },
          filters,
        } = request.body;
        const alertsClient = context.alerting?.getAlertsClient();
        if (!alertsClient || !alertTypeIds) {
          return response.notFound();
        }

        const start = moment(min).valueOf();
        const end = moment(max).valueOf();
        const status = await fetchStatus(
          alertsClient,
          alertTypeIds,
          clusterUuid,
          start,
          end,
          filters as CommonAlertFilter[]
        );
        return response.ok({ body: status });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
