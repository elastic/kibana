/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes';
import { generateAPIKey } from '../../synthetics_service/get_api_key';
import { API_URLS } from '../../../common/constants';

export const getAPIKeySyntheticsRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_APIKEY,
  validate: {},
  handler: async ({ request, response, server }): Promise<any> => {
    const { security } = server;

    const apiKey = await generateAPIKey({
      request,
      security,
      server,
      uptimePrivileges: true,
    });

    return { apiKey };
  },
});
