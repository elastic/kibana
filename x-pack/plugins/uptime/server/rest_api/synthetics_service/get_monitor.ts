/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsUpdateResponse, SavedObject } from 'kibana/server';
import { MonitorFields, SyntheticsMonitor, ConfigKey } from '../../../common/runtime_types';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from './service_errors';

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, server: { encryptedSavedObjects } }): Promise<any> => {
    const { monitorId } = request.params;
    const encryptedClient = encryptedSavedObjects.getClient();
    try {
      return await libs.requests.getSyntheticsMonitor({ monitorId, encryptedClient });
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
  handler: async ({
    request,
    savedObjectsClient,
    server: { encryptedSavedObjects, logger },
  }): Promise<any> => {
    const { perPage = 50, page, sortField, sortOrder, search } = request.query;
    // TODO: add query/filtering params
    const monitors: Array<SavedObject<SyntheticsMonitor>> = [];
    try {
      const encryptedClient = encryptedSavedObjects.getClient();
      const {
        saved_objects: encryptedMonitors,
        per_page: perPageT,
        ...rest
      } = await savedObjectsClient.find({
        type: syntheticsMonitorType,
        perPage,
        page,
        filter: search ? `${syntheticsMonitorType}.attributes.fields.name: ${search}` : '',
      });
      for (const monitor of encryptedMonitors) {
        const decryptedMonitor =
          await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitor>(
            syntheticsMonitor.name,
            monitor.id
          );
        decryptedMonitor.attributes = {
          ...decryptedMonitor.attributes,
          fields: JSON.parse(decryptedMonitor.attributes.fields),
        };
        monitors.push(decryptedMonitor);
      }
      return {
        ...rest,
        perPage: perPageT,
        monitors,
      };
    } catch (e) {
      console.warn('e', e);
      // todo, handle error for failed decryption or an error in general
      return {
        perPage,
        monitors: [],
      };
    }
  },
});
