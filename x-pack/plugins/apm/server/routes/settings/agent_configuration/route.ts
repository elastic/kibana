/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { createOrUpdateConfiguration } from './create_or_update_configuration';
import { searchConfigurations } from './search_configurations';
import { findExactConfiguration } from './find_exact_configuration';
import { listConfigurations } from './list_configurations';
import { getEnvironments } from './get_environments';
import { deleteConfiguration } from './delete_configuration';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getAgentNameByService } from './get_agent_name_by_service';
import { markAppliedByAgent } from './mark_applied_by_agent';
import {
  serviceRt,
  agentConfigurationIntakeRt,
} from '../../../../common/agent_configuration/runtime_types/agent_configuration_intake_rt';
import { getSearchTransactionsEvents } from '../../../lib/helpers/transactions';
import { syncAgentConfigsToApmPackagePolicies } from '../../fleet/sync_agent_configs_to_apm_package_policies';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createInternalESClientWithContext } from '../../../lib/helpers/create_es_client/create_internal_es_client';

// get list of configurations
const agentConfigurationRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/agent-configuration',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    configurations: Array<
      import('./../../../../common/agent_configuration/configuration_types').AgentConfiguration
    >;
  }> => {
    const { context, request, params, config } = resources;
    const internalESClient = await createInternalESClientWithContext({
      context,
      request,
      debug: params.query._inspect,
      config,
    });

    const configurations = await listConfigurations(internalESClient);

    return { configurations };
  },
});

// get a single configuration
const getSingleAgentConfigurationRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/agent-configuration/view',
  params: t.partial({
    query: serviceRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    import('./../../../../common/agent_configuration/configuration_types').AgentConfiguration
  > => {
    const { params, logger, context, request, config } = resources;
    const { name, environment, _inspect } = params.query;
    const service = { name, environment };

    const internalESClient = await createInternalESClientWithContext({
      context,
      request,
      debug: _inspect,
      config,
    });
    const exactConfig = await findExactConfiguration({
      service,
      internalESClient,
    });

    if (!exactConfig) {
      logger.info(
        `Config was not found for ${service.name}/${service.environment}`
      );

      throw Boom.notFound();
    }

    return exactConfig;
  },
});

// delete configuration
const deleteAgentConfigurationRoute = createApmServerRoute({
  endpoint: 'DELETE /api/apm/settings/agent-configuration',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.type({
    body: t.type({
      service: serviceRt,
    }),
  }),
  handler: async (resources): Promise<{ result: string }> => {
    const {
      params,
      logger,
      core,
      telemetryUsageCounter,
      context,
      request,
      config,
    } = resources;
    const { service } = params.body;

    const internalESClient = await createInternalESClientWithContext({
      context,
      request,
      debug: params.query._inspect,
      config,
    });
    const exactConfig = await findExactConfiguration({
      service,
      internalESClient,
    });
    if (!exactConfig) {
      logger.info(
        `Config was not found for ${service.name}/${service.environment}`
      );

      throw Boom.notFound();
    }

    logger.info(
      `Deleting config ${service.name}/${service.environment} (${exactConfig.id})`
    );

    const deleteConfigurationResult = await deleteConfiguration({
      configurationId: exactConfig.id,
      internalESClient,
    });

    if (resources.plugins.fleet) {
      await syncAgentConfigsToApmPackagePolicies({
        coreStartPromise: core.start(),
        fleetPluginStart: await resources.plugins.fleet.start(),
        internalESClient,
        telemetryUsageCounter,
      });
      logger.info(
        `Updated Fleet integration policy for APM to remove the deleted agent configuration.`
      );
    }

    return deleteConfigurationResult;
  },
});

// create/update configuration
const createOrUpdateAgentConfigurationRoute = createApmServerRoute({
  endpoint: 'PUT /api/apm/settings/agent-configuration',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.intersection([
    t.partial({ query: t.partial({ overwrite: toBooleanRt }) }),
    t.type({ body: agentConfigurationIntakeRt }),
  ]),
  handler: async (resources): Promise<void> => {
    const {
      params,
      logger,
      core,
      telemetryUsageCounter,
      context,
      request,
      config,
    } = resources;
    const { body, query } = params;

    const internalESClient = await createInternalESClientWithContext({
      context,
      request,
      debug: params.query._inspect,
      config,
    });

    // if the config already exists, it is fetched and updated
    // this is to avoid creating two configs with identical service params
    const exactConfig = await findExactConfiguration({
      service: body.service,
      internalESClient,
    });

    // if the config exists ?overwrite=true is required
    if (exactConfig && !query.overwrite) {
      throw Boom.badRequest(
        `A configuration already exists for "${body.service.name}/${body.service.environment}. Use ?overwrite=true to overwrite the existing configuration.`
      );
    }

    logger.info(
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
        internalESClient,
        telemetryUsageCounter,
      });
      logger.info(
        `Saved latest agent settings to Fleet integration policy for APM.`
      );
    }
  },
});

const searchParamsRt = t.intersection([
  t.type({ service: serviceRt }),
  t.partial({ etag: t.string, mark_as_applied_by_agent: t.boolean }),
]);

export type AgentConfigSearchParams = t.TypeOf<typeof searchParamsRt>;

// Lookup single configuration (used by APM Server)
const agentConfigurationSearchRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/settings/agent-configuration/search',
  params: t.type({
    body: searchParamsRt,
  }),
  options: { tags: ['access:apm'], disableTelemetry: true },
  handler: async (
    resources
  ): Promise<
    | import('@kbn/es-types').SearchHit<
        import('./../../../../common/agent_configuration/configuration_types').AgentConfiguration,
        undefined,
        undefined
      >
    | null
  > => {
    const { params, logger, context, config, request } = resources;

    const {
      service,
      etag,
      mark_as_applied_by_agent: markAsAppliedByAgent,
    } = params.body;

    const internalESClient = await createInternalESClientWithContext({
      context,
      request,
      debug: params.query._inspect,
      config,
    });
    const configuration = await searchConfigurations({
      service,
      internalESClient,
    });

    if (!configuration) {
      logger.debug(
        `[Central configuration] Config was not found for ${service.name}/${service.environment}`
      );
      return null;
    }

    // whether to update `applied_by_agent` field
    // It will be set to true of the etags match or if `markAsAppliedByAgent=true`
    // `markAsAppliedByAgent=true` means "force setting it to true regardless of etag". This is needed for Jaeger agent that doesn't have etags
    const willMarkAsApplied =
      (markAsAppliedByAgent || etag === configuration._source.etag) &&
      !configuration._source.applied_by_agent;

    logger.debug(
      `[Central configuration] Config was found for:
        service.name = ${service.name},
        service.environment = ${service.environment},
        etag (requested) = ${etag},
        etag (existing) = ${configuration._source.etag},
        markAsAppliedByAgent = ${markAsAppliedByAgent},
        willMarkAsApplied = ${willMarkAsApplied}`
    );

    if (willMarkAsApplied) {
      markAppliedByAgent({
        id: configuration._id,
        body: configuration._source,
        internalESClient,
      });
    }

    return configuration;
  },
});

/*
 * Utility endpoints (not documented as part of the public API)
 */

// get environments for service
const listAgentConfigurationEnvironmentsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/agent-configuration/environments',
  params: t.partial({
    query: t.partial({ serviceName: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    environments: Array<{ name: string; alreadyConfigured: boolean }>;
  }> => {
    const { context, request, params, config } = resources;
    const [internalESClient, apmEventClient] = await Promise.all([
      createInternalESClientWithContext({
        context,
        request,
        debug: params.query._inspect,
        config,
      }),
      getApmEventClient(resources),
    ]);
    const coreContext = await context.core;

    const { serviceName, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery: '',
      start,
      end,
    });
    const size = await coreContext.uiSettings.client.get<number>(
      maxSuggestions
    );
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
  endpoint: 'GET /api/apm/settings/agent-configuration/agent_name',
  params: t.type({
    query: t.type({ serviceName: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ agentName: string | undefined }> => {
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
