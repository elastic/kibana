/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { schema } from '@kbn/config-schema';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { uptimeMonitorType } from '../../lib/saved_objects';

export const deleteSyntheticsConfig: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.DELETE_CONFIG,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
    }),
  },
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const { monitorId } = request.query;
    const config = server.config;
    const monitor = await savedObjectsClient.get(uptimeMonitorType, monitorId);
    await savedObjectsClient.delete(uptimeMonitorType, monitorId);
    const data = {
      // @ts-ignore
      monitors: [{ ...monitor.attributes, id: monitor.id }],
    };

    try {
      // service doesn't currently take api key, but will need to be passed
      await axios({
        method: 'DELETE',
        url: config.unsafe.service.url,
        data,
        /* these credentials will come from user input, most likely in the form of a saved object when the admin
         * enables the synthetics service */
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${config.unsafe.service.username}:${config.unsafe.service.password}`
            ).toString('base64'),
        },
      });
    } catch (e) {
      console.log(e);
    }
  },
});
