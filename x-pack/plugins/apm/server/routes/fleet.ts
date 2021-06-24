/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { getCloudApmPackgePolicy } from '../lib/fleet/get_cloud_apm_package_policy';
import { createCloudApmPackgePolicy } from '../lib/fleet/create_cloud_apm_package_policy';
import { getUnsupportedApmServerSchema } from '../lib/fleet/get_unsupported_apm_server_schema';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      throw Boom.internal(
        i18n.translate('xpack.apm.fleet_has_data.fleetRequired', {
          defaultMessage: `Fleet plugin is required`,
        })
      );
    }
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasData: packagePolicies.total > 0 };
  },
});

const saveApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/fleet/apm_server_schema',
  options: { tags: ['access:apm', 'access:apm_write'] },
  params: t.type({
    body: t.type({
      schemaJson: jsonRt.pipe(t.UnknownRecord),
    }),
  }),
  handler: async (resources) => {
    const { params, logger, context } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const schema = params.body.schemaJson;
    await savedObjectsClient.create(
      'apm-server-settings',
      { schemaJson: JSON.stringify(schema) },
      { id: 'apm-server-settings', overwrite: true }
    );
    logger.info(`Stored apm-server settings.`);
  },
});

const getApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/apm_server_schema',
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources) => {
    const { context } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const { attributes } = await savedObjectsClient.get(
      'apm-server-settings',
      'apm-server-settings'
    );
    return attributes;
  },
});

const getUnsupportedApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/apm_server_schema/unsupported',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    return {
      unsupported: await getUnsupportedApmServerSchema({ savedObjectsClient }),
    };
  },
});

const getCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/cloud_apm_package_policy',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { plugins, context } = resources;
    if (!plugins.fleet) {
      return { messsage: 'Fleet plugin is required.' };
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const fleetPluginStart = await plugins.fleet.start();
    return {
      cloud_apm_package_policy: await getCloudApmPackgePolicy({
        savedObjectsClient,
        fleetPluginStart,
      }),
    };
  },
});

const createCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/fleet/cloud_apm_package_policy',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, logger, plugins } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const coreStart = await resources.core.start();
    const esClient = coreStart.elasticsearch.client.asScoped(resources.request)
      .asCurrentUser;
    if (!plugins.fleet) {
      return { messsage: 'Fleet plugin is required.' };
    }
    const fleetPluginStart = await plugins.fleet.start();
    return {
      cloud_apm_package_policy: await createCloudApmPackgePolicy({
        fleetPluginStart,
        savedObjectsClient,
        esClient,
        logger,
      }),
    };
  },
});

export const apmFleetRouteRepository = createApmServerRouteRepository()
  .add(hasFleetDataRoute)
  .add(saveApmServerSchemaRoute)
  .add(getApmServerSchemaRoute)
  .add(getUnsupportedApmServerSchemaRoute)
  .add(getCloudApmPackagePolicyRoute)
  .add(createCloudApmPackagePolicyRoute);
