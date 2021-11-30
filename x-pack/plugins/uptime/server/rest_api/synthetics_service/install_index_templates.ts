/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { UptimeServerSetup } from '../../lib/adapters';

export const installIndexTemplatesRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.INDEX_TEMPLATES,
  validate: {},
  handler: async ({ server, request, savedObjectsClient, uptimeEsClient }): Promise<any> => {
    return installSyntheticsIndexTemplates({
      server,
      savedObjectsClient,
      esClient: uptimeEsClient.baseESClient,
    });
  },
});

export async function installSyntheticsIndexTemplates({
  esClient,
  server,
  savedObjectsClient,
}: {
  server: UptimeServerSetup;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  // no need to add error handling here since fleetSetupCompleted is already wrapped in try/catch and will log
  // warning if setup fails to complete
  await server.fleet.fleetSetupCompleted();

  return await server.fleet.packageService.ensureInstalledPackage({
    esClient,
    savedObjectsClient,
    pkgName: 'synthetics',
  });
}
