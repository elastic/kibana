/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const installIndexTemplates: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.INDEX_TEMPLATES,
  validate: {},
  handler: async ({ server, request, savedObjectsClient, uptimeEsClient }): Promise<any> => {
    // no need to add error handling here since fleetSetupCompleted is already wrapped in try/catch and will log
    // warning if setup fails to complete
    await server.fleet.fleetSetupCompleted();

    return await server.fleet.packageService.ensureInstalledPackage({
      savedObjectsClient,
      pkgName: 'synthetics',
      esClient: uptimeEsClient.baseESClient,
    });
  },
});
