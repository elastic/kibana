/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from './service_errors';
import { normalizeSecrets } from '../../lib/synthetics_service/utils/secrets';

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    request,
    response,
    server: { encryptedSavedObjects },
    savedObjectsClient,
  }): Promise<any> => {
    const { monitorId } = request.params;
    const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();
    try {
      const monitorWithSecrets = await libs.requests.getSyntheticsMonitor({
        monitorId,
        encryptedSavedObjectsClient,
        savedObjectsClient,
      });
      return normalizeSecrets(monitorWithSecrets);
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
      sortField: schema.maybe(schema.string()),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
      search: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const { perPage = 50, page, sortField, sortOrder, search } = request.query;
    // TODO: add query/filtering params
    const {
      saved_objects: monitors,
      per_page: perPageT,
      ...rest
    } = await savedObjectsClient.find({
      type: syntheticsMonitorType,
      perPage,
      page,
      sortField,
      sortOrder,
      filter: search ? `${syntheticsMonitorType}.attributes.name: ${search}` : '',
    });
    return {
      ...rest,
      perPage: perPageT,
      monitors,
    };
  },
});
