/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getServiceNames } from '../../lib/settings/agent_configuration/get_service_names';
import { createOrUpdateConfiguration } from '../../lib/settings/agent_configuration/create_or_update_configuration';
import { searchConfigurations } from '../../lib/settings/agent_configuration/search_configurations';
import { findExactConfiguration } from '../../lib/settings/agent_configuration/find_exact_configuration';
import { listConfigurations } from '../../lib/settings/agent_configuration/list_configurations';
import { getEnvironments } from '../../lib/settings/agent_configuration/get_environments';
import { deleteConfiguration } from '../../lib/settings/agent_configuration/delete_configuration';
import { createRoute } from '../create_route';
import { getAgentNameByService } from '../../lib/settings/agent_configuration/get_agent_name_by_service';
import { markAppliedByAgent } from '../../lib/settings/agent_configuration/mark_applied_by_agent';
import {
  serviceRt,
  agentConfigurationIntakeRt,
} from '../../../common/agent_configuration/runtime_types/agent_configuration_intake_rt';
import { jsonRt } from '../../../common/runtime_types/json_rt';

// get list of configurations
export const agentConfigurationRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await listConfigurations({ setup });
  },
}));

// get a single configuration
export const getSingleAgentConfigurationRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration/view',
  params: {
    query: serviceRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { name, environment } = context.params.query;

    const service = { name, environment };
    const config = await findExactConfiguration({ service, setup });

    if (!config) {
      context.logger.info(
        `Config was not found for ${service.name}/${service.environment}`
      );

      throw Boom.notFound();
    }

    return config._source;
  },
}));

// delete configuration
export const deleteAgentConfigurationRoute = createRoute(() => ({
  method: 'DELETE',
  path: '/api/apm/settings/agent-configuration',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: {
    body: t.type({
      service: serviceRt,
    }),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { service } = context.params.body;

    const config = await findExactConfiguration({ service, setup });
    if (!config) {
      context.logger.info(
        `Config was not found for ${service.name}/${service.environment}`
      );

      throw Boom.notFound();
    }

    context.logger.info(
      `Deleting config ${service.name}/${service.environment} (${config._id})`
    );

    return await deleteConfiguration({
      configurationId: config._id,
      setup,
    });
  },
}));

// create/update configuration
export const createOrUpdateAgentConfigurationRoute = createRoute(() => ({
  method: 'PUT',
  path: '/api/apm/settings/agent-configuration',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: {
    query: t.partial({ overwrite: jsonRt.pipe(t.boolean) }),
    body: agentConfigurationIntakeRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { body, query } = context.params;

    // if the config already exists, it is fetched and updated
    // this is to avoid creating two configs with identical service params
    const config = await findExactConfiguration({
      service: body.service,
      setup,
    });

    // if the config exists ?overwrite=true is required
    if (config && !query.overwrite) {
      throw Boom.badRequest(
        `A configuration already exists for "${body.service.name}/${body.service.environment}. Use ?overwrite=true to overwrite the existing configuration.`
      );
    }

    context.logger.info(
      `${config ? 'Updating' : 'Creating'} config ${body.service.name}/${
        body.service.environment
      }`
    );

    return await createOrUpdateConfiguration({
      configurationId: config?._id,
      configurationIntake: body,
      setup,
    });
  },
}));

const searchParamsRt = t.intersection([
  t.type({ service: serviceRt }),
  t.partial({ etag: t.string, mark_as_applied_by_agent: t.boolean }),
]);

export type AgentConfigSearchParams = t.TypeOf<typeof searchParamsRt>;

// Lookup single configuration (used by APM Server)
export const agentConfigurationSearchRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/agent-configuration/search',
  params: {
    body: searchParamsRt,
  },
  handler: async ({ context, request }) => {
    const {
      service,
      etag,
      mark_as_applied_by_agent: markAsAppliedByAgent,
    } = context.params.body;

    const setup = await setupRequest(context, request);
    const config = await searchConfigurations({
      service,
      setup,
    });

    if (!config) {
      context.logger.info(
        `Config was not found for ${service.name}/${service.environment}`
      );
      throw Boom.notFound();
    }

    context.logger.info(
      `Config was found for ${service.name}/${service.environment}`
    );

    // update `applied_by_agent` field
    // when `markAsAppliedByAgent` is true (Jaeger agent doesn't have etags)
    // or if etags match.
    // this happens in the background and doesn't block the response
    if (
      (markAsAppliedByAgent || etag === config._source.etag) &&
      !config._source.applied_by_agent
    ) {
      markAppliedByAgent({ id: config._id, body: config._source, setup });
    }

    return config;
  },
}));

/*
 * Utility endpoints (not documented as part of the public API)
 */

// get list of services
export const listAgentConfigurationServicesRoute = createRoute(() => ({
  method: 'GET',
  path: '/api/apm/settings/agent-configuration/services',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await getServiceNames({
      setup,
    });
  },
}));

// get environments for service
export const listAgentConfigurationEnvironmentsRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration/environments',
  params: {
    query: t.partial({ serviceName: t.string }),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.query;
    return await getEnvironments({ serviceName, setup });
  },
}));

// get agentName for service
export const agentConfigurationAgentNameRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration/agent_name',
  params: {
    query: t.type({ serviceName: t.string }),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.query;
    const agentName = await getAgentNameByService({ serviceName, setup });
    return { agentName };
  },
}));
