/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { UMRestApiRouteFactory } from '../types';
import { UptimeCorePluginsStart } from '../../lib/adapters/framework/adapter_types';
import { API_URLS } from '../../../common/constants';
import { UptimeESClient } from '../../lib/lib';

export const installIndexTemplates: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.INDEX_TEMPLATES,
  validate: {},
  handler: async ({ server, request, savedObjectsClient, uptimeEsClient }): Promise<any> => {
    await generateAPIKey({ fleet: server.fleet, savedObjectsClient, request, uptimeEsClient });
  },
});

export const generateAPIKey = async ({
  fleet,
  request,
  savedObjectsClient,
  uptimeEsClient,
}: {
  fleet?: UptimeCorePluginsStart['fleet'];
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  uptimeEsClient: UptimeESClient;
}) => {
  try {
    await fleet?.fleetSetupCompleted();
    await fleet?.packageService.ensureInstalledPackage({
      savedObjectsClient,
      pkgName: 'synthetics',
      esClient: uptimeEsClient.baseESClient,
    });
  } catch (e) {
    throw e;
  }
};
