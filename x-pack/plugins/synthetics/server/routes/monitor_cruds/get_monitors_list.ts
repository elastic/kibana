/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { API_URLS } from '../../../common/constants';
import { getMonitors, isMonitorsQueryFiltered, QuerySchema } from '../common';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';

export const getAllSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: QuerySchema,
  },
  handler: async (routeContext): Promise<any> => {
    const { request, savedObjectsClient, syntheticsMonitorClient } = routeContext;
    const totalCountQuery = async () => {
      if (isMonitorsQueryFiltered(request.query)) {
        return savedObjectsClient.find({
          type: syntheticsMonitorType,
          perPage: 0,
          page: 1,
        });
      }
    };

    const [queryResult, totalCount] = await Promise.all([
      getMonitors(routeContext),
      totalCountQuery(),
    ]);

    const absoluteTotal = totalCount?.total ?? queryResult.total;

    const { saved_objects: monitors, per_page: perPageT, ...rest } = queryResult;

    return {
      ...rest,
      monitors,
      absoluteTotal,
      perPage: perPageT,
      syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
    };
  },
});
