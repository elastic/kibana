/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitors, isMonitorsQueryFiltered, QuerySchema } from '../common';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { mapSavedObjectToMonitor } from './helper';

export const getAllSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
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

    const [queryResultSavedObjects, totalCount] = await Promise.all([
      getMonitors(routeContext),
      totalCountQuery(),
    ]);

    const absoluteTotal = totalCount?.total ?? queryResultSavedObjects.total;

    const { saved_objects: savedObjects, per_page: perPageT, ...rest } = queryResultSavedObjects;

    return {
      ...rest,
      monitors: savedObjects.map(mapSavedObjectToMonitor),
      absoluteTotal,
      perPage: perPageT,
      syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
    };
  },
});
