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
import { fetchAPIKey } from './sync_synthetics_config';
import { getDefaultESHosts } from '../../lib/synthetics_service/get_cloud_es_host';
import { getServiceCredentials } from '../../lib/synthetics_service/push_configs';
import { savedObjectsAdapter } from '../../lib/saved_objects';

export const getSyntheticsConfig: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.GET_IN_PROGRESS_JOBS,
  validate: {
    body: schema.object({
      monitor: schema.any(),
    }),
  },
  handler: async ({
    savedObjectsClient,
    request,
    server,
    context,
    uptimeEsClient,
  }): Promise<any> => {
    const { monitor } = request.body;
    const { config, cloud } = server;

    const apiKey = await fetchAPIKey({
      savedObjects: context.core.savedObjects,
      security: server.security,
    });

    const settings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const { serviceUrl, servicePassword, serviceUsername } = getServiceCredentials({
      config,
      settings,
    });

    const esHosts = getDefaultESHosts({ config, cloud });

    const data = {
      // @ts-ignore
      monitors: [monitor],
      output: {
        hosts: esHosts,
        api_key: `${apiKey.id}:${apiKey.api_key}`,
      },
    };

    try {
      // service doesn't currently take api key, but will need to be passed
      const response = await axios({
        method: 'GET',
        url: serviceUrl + '/cronjob',
        data,
        /* these credentials will come from user input, most likely in the form of a saved object when the admin
         * enables the synthetics service */
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${serviceUsername}:${servicePassword}`).toString('base64'),
        },
      });
      return { list: response.data };
    } catch (e) {
      console.log(e);
    }
  },
});
