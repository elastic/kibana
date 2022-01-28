/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers, SavedObjectsClient } from '../../../../../../src/core/server';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from './service_errors';

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, savedObjectsClient }): Promise<any> => {
    const { monitorId } = request.params;
    try {
      return await savedObjectsClient.get(syntheticsMonitorType, monitorId);
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});

export const getAllSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: schema.object({
      page: schema.maybe(schema.number()),
      perPage: schema.maybe(schema.number()),
      search: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const { perPage = 50, page, search } = request.query;

    // TODO: add query/filtering params
    const {
      saved_objects: monitors,
      per_page: perPageT,
      ...rest
    } = await savedObjectsClient.find({
      type: syntheticsMonitorType,
      perPage,
      page,
      filter: search ? `${syntheticsMonitorType}.attributes.name: ${search}` : '',
    });
    return {
      ...rest,
      perPage: perPageT,
      monitors,
    };
  },
});
