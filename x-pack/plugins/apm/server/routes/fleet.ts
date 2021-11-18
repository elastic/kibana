/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { keyBy } from 'lodash';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
} from '../../common/apm_saved_object_constants';
import { createCloudApmPackgePolicy } from '../lib/fleet/create_cloud_apm_package_policy';
import { getFleetAgents } from '../lib/fleet/get_agents';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';
import {
  getApmPackagePolicy,
  getCloudAgentPolicy,
} from '../lib/fleet/get_cloud_apm_package_policy';
import { getUnsupportedApmServerSchema } from '../lib/fleet/get_unsupported_apm_server_schema';
import { isSuperuser } from '../lib/fleet/is_superuser';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { setupRequest } from '../lib/helpers/setup_request';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      return { hasData: false };
    }
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasData: packagePolicies.total > 0 };
  },
});

const fleetAgentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/agents',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const cloudSetup = plugins.cloud?.setup;
    const cloudStandaloneSetup = cloudSetup
      ? {
          apmServerUrl: cloudSetup?.apm.url,
          secretToken: cloudSetup?.apm.secretToken,
        }
      : undefined;

    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      return { cloudStandaloneSetup, fleetAgents: [], isFleetEnabled: false };
    }
    // fetches package policies that contains APM integrations
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });

    const policiesGroupedById = keyBy(packagePolicies.items, 'policy_id');

    // fetches all agents with the found package policies
    const fleetAgents = await getFleetAgents({
      policyIds: Object.keys(policiesGroupedById),
      core,
      fleetPluginStart,
    });

    return {
      cloudStandaloneSetup,
      isFleetEnabled: true,
      fleetAgents: fleetAgents.map((agent) => {
        const packagePolicy = policiesGroupedById[agent.id];
        const packagePolicyVars = packagePolicy.inputs[0]?.vars;
        return {
          id: agent.id,
          name: agent.name,
          apmServerUrl: packagePolicyVars?.url?.value,
          secretToken: packagePolicyVars?.secret_token?.value,
        };
      }),
    };
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

const getUnsupportedApmServerSchemaRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
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
  endpoint: 'GET /internal/apm/fleet/migration_check',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { plugins, context, config, request } = resources;
    const cloudApmMigrationEnabled = config.agent.migrations.enabled;
    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(FLEET_SECURITY_REQUIRED_MESSAGE);
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const fleetPluginStart = await plugins.fleet.start();
    const securityPluginStart = await plugins.security.start();
    const hasRequiredRole = isSuperuser({ securityPluginStart, request });
    const cloudAgentPolicy = hasRequiredRole
      ? await getCloudAgentPolicy({
          savedObjectsClient,
          fleetPluginStart,
        })
      : undefined;
    const apmPackagePolicy = getApmPackagePolicy(cloudAgentPolicy);
    return {
      has_cloud_agent_policy: !!cloudAgentPolicy,
      has_cloud_apm_package_policy: !!apmPackagePolicy,
      cloud_apm_migration_enabled: cloudApmMigrationEnabled,
      has_required_role: hasRequiredRole,
      cloud_apm_package_policy: apmPackagePolicy,
    };
  },
});

const createCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/fleet/cloud_apm_package_policy',
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources) => {
    const { plugins, context, config, request, logger } = resources;
    const cloudApmMigrationEnabled = config.agent.migrations.enabled;
    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(FLEET_SECURITY_REQUIRED_MESSAGE);
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const coreStart = await resources.core.start();
    const esClient = coreStart.elasticsearch.client.asScoped(
      resources.request
    ).asCurrentUser;
    const cloudPluginSetup = plugins.cloud?.setup;
    const fleetPluginStart = await plugins.fleet.start();
    const securityPluginStart = await plugins.security.start();
    const hasRequiredRole = isSuperuser({ securityPluginStart, request });
    if (!hasRequiredRole || !cloudApmMigrationEnabled) {
      throw Boom.forbidden(CLOUD_SUPERUSER_REQUIRED_MESSAGE);
    }

    const setup = await setupRequest(resources);

    const cloudApmPackagePolicy = await createCloudApmPackgePolicy({
      cloudPluginSetup,
      fleetPluginStart,
      savedObjectsClient,
      esClient,
      logger,
      setup,
    });

    return { cloudApmPackagePolicy };
  },
});

export const apmFleetRouteRepository = createApmServerRouteRepository()
  .add(hasFleetDataRoute)
  .add(fleetAgentsRoute)
  .add(saveApmServerSchemaRoute)
  .add(getUnsupportedApmServerSchemaRoute)
  .add(getMigrationCheckRoute)
  .add(createCloudApmPackagePolicyRoute);

const FLEET_SECURITY_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.fleet.fleetSecurityRequired',
  { defaultMessage: `Fleet and Security plugins are required` }
);

const CLOUD_SUPERUSER_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.fleet.cloud_apm_package_policy.requiredRoleOnCloud',
  {
    defaultMessage:
      'Operation only permitted by Elastic Cloud users with the superuser role.',
  }
);
