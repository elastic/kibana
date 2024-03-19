/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getHasIntegrationMonitorsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_HAS_INTEGRATION_MONITORS,
  validate: {},
  handler: async ({ savedObjectsClient, server }): Promise<any> => {
    const monitors = await server.fleet.packagePolicyService.list(savedObjectsClient, {
      kuery:
        'ingest-package-policies.package.name:synthetics and not ingest-package-policies.is_managed:true',
      perPage: 1,
    });
    return {
      hasIntegrationMonitors: monitors.total > 0,
    };
  },
});
