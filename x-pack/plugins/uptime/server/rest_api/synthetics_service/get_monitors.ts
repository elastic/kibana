/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
    }),
  },
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const { monitorId } = request.params;
    return await savedObjectsClient.get(syntheticsMonitorType, monitorId);
  },
});

export const getAllSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: schema.object({
      page: schema.maybe(schema.number()),
      perPage: schema.maybe(schema.number()),
    }),
  },
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const { perPage = 50, page } = request.query;
    // TODO: add query/filtering params
    return await savedObjectsClient.find({ type: syntheticsMonitorType, perPage, page });
  },
});
