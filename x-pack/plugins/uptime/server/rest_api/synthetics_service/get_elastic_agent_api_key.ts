/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import {
  getAPIKeyForElasticAgentMonitoring,
  generateAPIKeyForElasticAgentMonitoring,
} from '../../lib/synthetics_service/get_api_key';

export const hasApiKeyForElasticAgentMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.ELASTIC_AGENT_MONITOR_API_KEY,
  validate: {},
  handler: async ({ request, server }): Promise<any> => {
    const apiKey = await getAPIKeyForElasticAgentMonitoring({ request, server });

    return {
      hasApiKey: Boolean(apiKey),
    };
  },
});

export const setApiKeyForElasticAgentMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.ELASTIC_AGENT_MONITOR_API_KEY,
  validate: {},
  handler: async ({ request, server }): Promise<any> => {
    await generateAPIKeyForElasticAgentMonitoring({ request, server });
  },
});
