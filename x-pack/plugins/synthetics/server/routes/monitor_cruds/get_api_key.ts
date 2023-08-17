/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { generateAPIKey } from '../../synthetics_service/get_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getAPIKeySyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_APIKEY,
  validate: {},
  handler: async ({ request, server }): Promise<any> => {
    const apiKey = await generateAPIKey({
      request,
      server,
      projectAPIKey: true,
    });

    return { apiKey };
  },
});
