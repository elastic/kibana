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
} from '../../../common/apm_saved_object_constants';
import { createCloudApmPackgePolicy } from './create_cloud_apm_package_policy';
import { getFleetAgents } from './get_agents';
import { getApmPackgePolicies } from './get_apm_package_policies';
import {
  getApmPackagePolicy,
  getCloudAgentPolicy,
} from './get_cloud_apm_package_policy';
import { getUnsupportedApmServerSchema } from './get_unsupported_apm_server_schema';
import { isSuperuser } from './is_superuser';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/has_apm_policies',
  options: { tags: [] },
  handler: async ({ core, plugins }): Promise<{ hasApmPolicies: boolean }> => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      return { hasApmPolicies: false };
    }
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasApmPolicies: packagePolicies.total > 0 };
  },
});

const fleetAgentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fleet/agents',
  options: { tags: [] },
  handler: async ({
    core,
    plugins,
  }): Promise<
    | {
        cloudStandaloneSetup:
          | {
              apmServerUrl: string | undefined;
              secretToken: string | undefined;
            }
          | undefined;
        fleetAgents: never[];
        isFleetEnabled: false;
      }
    | {
        cloudStandaloneSetup:
          | {
              apmServerUrl: string | undefined;
              secretToken: string | undefined;
            }
          | undefined;
        isFleetEnabled: true;
        fleetAgents: Array<{
          id: string;
          name: string;
          apmServerUrl: any;
          secretToken: any;
        }>;
      }
  > => {
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
      fleetAgents: fleetAgents.map(
        (
          agent
        ): {
          id: string;
          name: string;
          apmServerUrl: string | undefined;
          secretToken: string | undefined;
        } => {
          const packagePolicy = policiesGroupedById[agent.id];
          const packagePolicyVars = packagePolicy.inputs[0]?.vars;
          return {
            id: agent.id,
            name: agent.name,
            apmServerUrl: packagePolicyVars?.url?.value,
            secretToken: packagePolicyVars?.secret_token?.value,
          };
        }
      ),
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
  handler: async (resources): Promise<void> => {
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
  handler: async (
    resources
  ): Promise<{ unsupported: Array<{ key: string; value: any }> }> => {
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
  handler: async (
    resources
  ): Promise<{
    has_cloud_agent_policy: boolean;
    has_cloud_apm_package_policy: boolean;
    cloud_apm_migration_enabled: boolean;
    has_required_role: boolean | undefined;
    cloud_apm_package_policy:
      | import('./../../../../fleet/common/index').PackagePolicy
      | undefined;
    has_apm_integrations: boolean;
  }> => {
    const { core, plugins, context, config, request } = resources;
    const cloudApmMigrationEnabled = config.agent.migrations.enabled;
    if (!plugins.fleet || !plugins.security) {
      throw Boom.internal(FLEET_SECURITY_REQUIRED_MESSAGE);
    }
    const savedObjectsClient = context.core.savedObjects.client;
    const [fleetPluginStart, securityPluginStart] = await Promise.all([
      plugins.fleet.start(),
      plugins.security.start(),
    ]);
    const hasRequiredRole = isSuperuser({ securityPluginStart, request });
    const cloudAgentPolicy = hasRequiredRole
      ? await getCloudAgentPolicy({
          savedObjectsClient,
          fleetPluginStart,
        })
      : undefined;
    const apmPackagePolicy = getApmPackagePolicy(cloudAgentPolicy);
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return {
      has_cloud_agent_policy: !!cloudAgentPolicy,
      has_cloud_apm_package_policy: !!apmPackagePolicy,
      cloud_apm_migration_enabled: cloudApmMigrationEnabled,
      has_required_role: hasRequiredRole,
      cloud_apm_package_policy: apmPackagePolicy,
      has_apm_integrations: packagePolicies.total > 0,
    };
  },
});

const createCloudApmPackagePolicyRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/fleet/cloud_apm_package_policy',
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (
    resources
  ): Promise<{
    cloudApmPackagePolicy: import('./../../../../fleet/common/index').PackagePolicy;
  }> => {
    const { plugins, context, config, request, logger, kibanaVersion } =
      resources;
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
      kibanaVersion,
    });

    return { cloudApmPackagePolicy };
  },
});

export const apmFleetRouteRepository = {
  ...hasFleetDataRoute,
  ...fleetAgentsRoute,
  ...saveApmServerSchemaRoute,
  ...getUnsupportedApmServerSchemaRoute,
  ...getMigrationCheckRoute,
  ...createCloudApmPackagePolicyRoute,
};

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
