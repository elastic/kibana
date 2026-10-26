/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import {
  routeDefinitions,
  type ListAgentConfigurationsResponse,
  type GetSingleAgentConfigurationResponse,
  type DeleteAgentConfigurationResponse,
  type SearchAgentConfigurationResponse,
  type ListAgentConfigurationEnvironmentsResponse,
  type AgentConfigurationAgentNameResponse,
} from '@kbn/apm-api-shared';
import type { ApmFeatureFlags } from '../../../../common/apm_feature_flags';
import { createInternalESClientWithResources } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getSearchTransactionsEvents } from '../../../lib/helpers/transactions';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { syncAgentConfigsToApmPackagePolicies } from '../../fleet/sync_agent_configs_to_apm_package_policies';
import { createOrUpdateConfiguration } from './create_or_update_configuration';
import { deleteConfiguration } from './delete_configuration';
import { findExactConfiguration } from './find_exact_configuration';
import { getAgentNameByService } from './get_agent_name_by_service';
import { getEnvironments } from './get_environments';
import { handleAgentConfigurationSearch } from './handle_agent_configuration_search';
import { listConfigurations } from './list_configurations';

function throwNotFoundIfAgentConfigNotAvailable(featureFlags: ApmFeatureFlags): void {
  if (!featureFlags.agentConfigurationAvailable) {
    throw Boom.notFound();
  }
}

// get list of configurations
const agentConfigurationRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.list.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ListAgentConfigurationsResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const apmIndices = await resources.getApmIndices();
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithResources(resources),
      getApmEventClient(resources),
    ]);
    const configurations = await listConfigurations({
      internalESClient,
      apmIndices,
      apmEventClient,
    });

    return { configurations };
  },
});

// get a single configuration
const getSingleAgentConfigurationRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.getSingle.endpoint,
  params: routeDefinitions.agentConfiguration.getSingle.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<GetSingleAgentConfigurationResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const { params, logger } = resources;
    const { name, environment } = params.query;
    const service = { name, environment };
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithResources(resources),
      getApmEventClient(resources),
    ]);
    const exactConfig = await findExactConfiguration({
      service,
      internalESClient,
      apmEventClient,
    });

    if (!exactConfig) {
      logger.debug(`Config was not found for ${service.name}/${service.environment}`);

      throw Boom.notFound();
    }

    return exactConfig;
  },
});

// delete configuration
const deleteAgentConfigurationRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.delete.endpoint,
  params: routeDefinitions.agentConfiguration.delete.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<DeleteAgentConfigurationResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const { params, logger, core, telemetryUsageCounter } = resources;
    const { service } = params.body;
    const apmIndices = await resources.getApmIndices();
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithResources(resources),
      getApmEventClient(resources),
    ]);
    const exactConfig = await findExactConfiguration({
      service,
      internalESClient,
      apmEventClient,
    });
    if (!exactConfig) {
      logger.debug(`Config was not found for ${service.name}/${service.environment}`);

      throw Boom.notFound();
    }

    logger.debug(`Deleting config ${service.name}/${service.environment} (${exactConfig.id})`);

    const deleteConfigurationResult = await deleteConfiguration({
      configurationId: exactConfig.id!,
      internalESClient,
    });

    if (resources.plugins.fleet) {
      await syncAgentConfigsToApmPackagePolicies({
        coreStartPromise: core.start(),
        fleetPluginStart: await resources.plugins.fleet.start(),
        internalESClient,
        apmIndices,
        telemetryUsageCounter,
      });
      logger.debug(
        `Updated Fleet integration policy for APM to remove the deleted agent configuration.`
      );
    }

    return deleteConfigurationResult;
  },
});

// create/update configuration
const createOrUpdateAgentConfigurationRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.createOrUpdate.endpoint,
  params: routeDefinitions.agentConfiguration.createOrUpdate.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<void> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);
    const { params, logger, core, telemetryUsageCounter } = resources;
    const { body, query } = params;
    const apmIndices = await resources.getApmIndices();
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithResources(resources),
      getApmEventClient(resources),
    ]);

    // if the config already exists, it is fetched and updated
    // this is to avoid creating two configs with identical service params
    const exactConfig = await findExactConfiguration({
      service: body.service,
      internalESClient,
      apmEventClient,
    });

    // if the config exists ?overwrite=true is required
    if (exactConfig && !query.overwrite) {
      throw Boom.badRequest(
        `A configuration already exists for "${body.service.name}/${body.service.environment}. Use ?overwrite=true to overwrite the existing configuration.`
      );
    }

    logger.debug(
      `${exactConfig ? 'Updating' : 'Creating'} config ${body.service.name}/${
        body.service.environment
      }`
    );

    await createOrUpdateConfiguration({
      configurationId: exactConfig?.id,
      configurationIntake: body,
      internalESClient,
    });

    if (resources.plugins.fleet) {
      await syncAgentConfigsToApmPackagePolicies({
        coreStartPromise: core.start(),
        fleetPluginStart: await resources.plugins.fleet.start(),
        apmIndices,
        internalESClient,
        telemetryUsageCounter,
      });
      logger.debug(`Saved latest agent settings to Fleet integration policy for APM.`);
    }
  },
});

// Lookup single configuration (used by APM Server)
const agentConfigurationSearchRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.search.endpoint,
  params: routeDefinitions.agentConfiguration.search.params,
  options: { disableTelemetry: true },
  security: {
    authz: {
      requiredPrivileges: ['apm'],
    },
  },
  handler: async (resources): Promise<SearchAgentConfigurationResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const { params, logger } = resources;
    const internalESClient = await createInternalESClientWithResources(resources);

    return handleAgentConfigurationSearch({
      params: params.body,
      internalESClient,
      logger,
    });
  },
});

/*
 * Utility endpoints (not documented as part of the public API)
 */

// get environments for service
const listAgentConfigurationEnvironmentsRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.listEnvironments.endpoint,
  params: routeDefinitions.agentConfiguration.listEnvironments.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ListAgentConfigurationEnvironmentsResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const { context, params, config } = resources;
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithResources(resources),
      getApmEventClient(resources),
    ]);
    const coreContext = await context.core;

    const { serviceName } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery: '',
    });

    const size = await coreContext.uiSettings.client.get<number>(maxSuggestions);
    const environments = await getEnvironments({
      serviceName,
      internalESClient,
      apmEventClient,
      searchAggregatedTransactions,
      size,
    });

    return { environments };
  },
});

// get agentName for service
const agentConfigurationAgentNameRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentConfiguration.agentName.endpoint,
  params: routeDefinitions.agentConfiguration.agentName.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<AgentConfigurationAgentNameResponse> => {
    throwNotFoundIfAgentConfigNotAvailable(resources.featureFlags);

    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.query;
    const agentName = await getAgentNameByService({
      serviceName,
      apmEventClient,
    });
    return { agentName };
  },
});

export const agentConfigurationRouteRepository = {
  ...agentConfigurationRoute,
  ...getSingleAgentConfigurationRoute,
  ...deleteAgentConfigurationRoute,
  ...createOrUpdateAgentConfigurationRoute,
  ...agentConfigurationSearchRoute,
  ...listAgentConfigurationEnvironmentsRoute,
  ...agentConfigurationAgentNameRoute,
};
