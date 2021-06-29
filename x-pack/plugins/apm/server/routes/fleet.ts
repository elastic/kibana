/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
} from '../../common/apm_saved_object_constants';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import {
  getCloudAgentPolicy,
  getApmPackagePolicy,
} from '../lib/fleet/get_cloud_apm_package_policy';
import { createCloudApmPackgePolicy } from '../lib/fleet/create_cloud_apm_package_policy';
import { getUnsupportedApmServerSchema } from '../lib/fleet/get_unsupported_apm_server_schema';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';
import { isSuperuser } from '../lib/fleet/is_superuser';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      throw Boom.internal(fleetPluginRequireMessage);
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
      schema: t.record(t.string, t.unknown),
    }),
  }),
  handler: async (resources) => {
    const { params, logger, core } = resources;
    const savedObjectsClient = await getInternalSavedObjectsClient(core.setup);
    const { schema } = params.body;
    await savedObjectsClient.create(
      APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
      { schemaJson: JSON.stringify(schema) },
      { id: APM_SERVER_SCHEMA_SAVED_OBJECT_ID, overwrite: true }
    );
    logger.info(`Stored apm-server schema.`);
  },
});

const getApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/apm_server_schema',
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources) => {
    const { context } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const {
      attributes,
    }: { attributes: { schemaJson: string } } = await savedObjectsClient.get(
      APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
      APM_SERVER_SCHEMA_SAVED_OBJECT_ID
    );
    return { schema: JSON.parse(attributes.schemaJson) };
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

const getMigrationCheckRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/migration_check',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { plugins, context, config, request } = resources;
    const cloudApmMigrationEnabled =
      config['xpack.apm.agent.migrations.enabled'];
    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(fleetSecurityPluginsRequireMessage);
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const fleetPluginStart = await plugins.fleet.start();
    const securityPluginStart = await plugins.security.start();
    const hasRequiredRole = isSuperuser({ securityPluginStart, request });
    const cloudAgentPolicy = await getCloudAgentPolicy({
      savedObjectsClient,
      fleetPluginStart,
    });
    return {
      has_cloud_agent_policy: !!cloudAgentPolicy,
      has_cloud_apm_package_policy: !!getApmPackagePolicy(cloudAgentPolicy),
      cloud_apm_migration_enabled: cloudApmMigrationEnabled,
      has_required_role: hasRequiredRole,
    };
  },
});

const createCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/fleet/cloud_apm_package_policy',
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources) => {
    const { plugins, context, config, request, logger } = resources;
    const cloudApmMigrationEnabled =
      config['xpack.apm.agent.migrations.enabled'];
    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(fleetSecurityPluginsRequireMessage);
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const coreStart = await resources.core.start();
    const esClient = coreStart.elasticsearch.client.asScoped(resources.request)
      .asCurrentUser;
    const fleetPluginStart = await plugins.fleet.start();
    const securityPluginStart = await plugins.security.start();
    const hasRequiredRole = isSuperuser({ securityPluginStart, request });
    if (!hasRequiredRole || !cloudApmMigrationEnabled) {
      throw Boom.forbidden(requiredRoleOnCloudMessage);
    }
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
  .add(getMigrationCheckRoute)
  .add(createCloudApmPackagePolicyRoute);

const fleetPluginRequireMessage = i18n.translate(
  'xpack.apm.api.fleet.has_data.fleetRequired',
  {
    defaultMessage: `Fleet plugin is required`,
  }
);

const fleetSecurityPluginsRequireMessage = i18n.translate(
  'xpack.apm.api.fleet.fleetSecurityRequired',
  { defaultMessage: `Fleet and Security plugins are required` }
);

const requiredRoleOnCloudMessage = i18n.translate(
  'xpack.apm.api.fleet.cloud_apm_package_policy.requiredRoleOnCloud',
  {
    defaultMessage:
      'Operation only permitted by Elastic Cloud users with the superuser role.',
  }
);
