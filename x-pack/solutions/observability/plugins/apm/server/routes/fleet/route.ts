/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import type { ApmFeatureFlags } from '../../../common/apm_feature_flags';
import { createInternalESClientWithResources } from '../../lib/helpers/create_es_client/create_internal_es_client';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { createCloudApmPackgePolicy } from './create_cloud_apm_package_policy';
import type { FleetAgentResponse } from './get_agents';
import { getFleetAgents } from './get_agents';
import { getApmPackagePolicies } from './get_apm_package_policies';
import { getJavaAgentVersionsFromRegistry } from './get_java_agent_versions';
import type { UnsupportedApmServerSchema } from './get_unsupported_apm_server_schema';
import { getUnsupportedApmServerSchema } from './get_unsupported_apm_server_schema';
import { isSuperuser } from './is_superuser';
import type { RunMigrationCheckResponse } from './run_migration_check';
import { runMigrationCheck } from './run_migration_check';

function throwNotFoundIfFleetMigrationNotAvailable(featureFlags: ApmFeatureFlags): void {
  if (!featureFlags.migrationToFleetAvailable) {
    throw Boom.notFound();
  }
}

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/has_apm_policies',
  security: {
    authz: {
      enabled: false,
      reason:
        "It's being used in the tutorial page, so it needs to be available for users even if they don't have APM permissions.",
    },
  },
  handler: async ({ core, plugins }): Promise<{ hasApmPolicies: boolean }> => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      return { hasApmPolicies: false };
    }
    const coreStart = await core.start();
    const packagePolicies = await getApmPackagePolicies({
      coreStart,
      fleetPluginStart,
    });
    return { hasApmPolicies: packagePolicies.total > 0 };
  },
});

const fleetAgentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/agents',
  security: {
    authz: {
      enabled: false,
      reason:
        "It's being used in the tutorial page, so it needs to be available for users even if they don't have APM permissions.",
    },
  },
  handler: async ({ core, plugins }): Promise<FleetAgentResponse> => {
    return getFleetAgents({
      coreStart: await core.start(),
      cloudPluginSetup: plugins.cloud?.setup,
      fleetPluginStart: await plugins.fleet?.start(),
    });
  },
});

const saveApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/fleet/apm_server_schema 2023-10-31',
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  params: t.type({
    body: t.type({
      schema: t.record(t.string, t.unknown),
    }),
  }),
  handler: async (resources): Promise<void> => {
    throwNotFoundIfFleetMigrationNotAvailable(resources.featureFlags);
    const { params, logger, core } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
    const { schema } = params.body;
    await savedObjectsClient.create(
      APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
      { schemaJson: JSON.stringify(schema) },
      { id: APM_SERVER_SCHEMA_SAVED_OBJECT_ID, overwrite: true }
    );
    logger.debug(`Stored apm-server schema.`);
  },
});

const getUnsupportedApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<{ unsupported: UnsupportedApmServerSchema }> => {
    throwNotFoundIfFleetMigrationNotAvailable(resources.featureFlags);
    const { context } = resources;
    const savedObjectsClient = (await context.core).savedObjects.client;
    return {
      unsupported: await getUnsupportedApmServerSchema({ savedObjectsClient }),
    };
  },
});

const getMigrationCheckRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/migration_check',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<RunMigrationCheckResponse> => {
    const { core, plugins, context, config, request } = resources;
    throwNotFoundIfFleetMigrationNotAvailable(resources.featureFlags);

    const { fleet, security } = plugins;

    if (!fleet || !security) {
      throw Boom.internal(FLEET_SECURITY_REQUIRED_MESSAGE);
    }

    return runMigrationCheck({
      core,
      plugins: {
        ...plugins,
        fleet,
        security,
      },
      context,
      config,
      request,
    });
  },
});

const createCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/fleet/cloud_apm_package_policy',
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async (
    resources
  ): Promise<{
    cloudApmPackagePolicy: PackagePolicy;
  }> => {
    const { plugins, context, config, request, logger } = resources;
    const cloudApmMigrationEnabled = config.agent.migrations.enabled;

    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(FLEET_SECURITY_REQUIRED_MESSAGE);
    }

    const [savedObjectsClient, coreStart, fleetPluginStart, apmIndices] = await Promise.all([
      (await context.core).savedObjects.client,
      resources.core.start(),
      plugins.fleet.start(),
      resources.getApmIndices(),
    ]);

    const esClient = coreStart.elasticsearch.client.asScoped(resources.request).asCurrentUser;
    const cloudPluginSetup = plugins.cloud?.setup;

    const hasRequiredRole = isSuperuser({ coreStart, request });
    if (!hasRequiredRole || !cloudApmMigrationEnabled) {
      throw Boom.forbidden(CLOUD_SUPERUSER_REQUIRED_MESSAGE);
    }

    const internalESClient = await createInternalESClientWithResources(resources);
    const cloudApmPackagePolicy = await createCloudApmPackgePolicy({
      cloudPluginSetup,
      fleetPluginStart,
      savedObjectsClient,
      esClient,
      logger,
      internalESClient,
      apmIndices,
      request,
    });

    return { cloudApmPackagePolicy };
  },
});

const javaAgentVersions = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/java_agent_versions',
  security: {
    authz: {
      enabled: false,
      reason:
        'It returns static information stored in a public file in https://repo1.maven.org/maven2/co/elastic/apm/elastic-apm-agent/maven-metadata.xml',
    },
  },
  handler: async (): Promise<{ versions: string[] | undefined }> => {
    const versions = await getJavaAgentVersionsFromRegistry();
    return {
      versions,
    };
  },
});

export const apmFleetRouteRepository = {
  ...hasFleetDataRoute,
  ...fleetAgentsRoute,
  ...saveApmServerSchemaRoute,
  ...getUnsupportedApmServerSchemaRoute,
  ...getMigrationCheckRoute,
  ...createCloudApmPackagePolicyRoute,
  ...javaAgentVersions,
};

const FLEET_SECURITY_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.fleet.fleetSecurityRequired',
  { defaultMessage: `Fleet and Security plugins are required` }
);

const CLOUD_SUPERUSER_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.fleet.cloud_apm_package_policy.requiredRoleOnCloud',
  {
    defaultMessage: 'Operation only permitted by Elastic Cloud users with the superuser role.',
  }
);
