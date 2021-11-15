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

export const getSyntheticsConfig: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.GET_IN_PROGRESS_JOBS,
  validate: {
    body: schema.object({
      monitor: schema.any(),
    }),
  },
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const { monitor } = request.body;
    const config = server.config;
    const data = {
      // @ts-ignore
      monitors: [monitor],
    };

    try {
      // service doesn't currently take api key, but will need to be passed
      const response = await axios({
        method: 'GET',
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
      return { list: response.data };
    } catch (e) {
      console.log(e);
    }
  },
});
