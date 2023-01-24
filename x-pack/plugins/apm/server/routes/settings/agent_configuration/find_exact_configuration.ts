/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/es-types';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { APM_AGENT_CONFIGURATION_INDEX } from '../apm_indices/get_apm_indices';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getConfigsAppliedToAgentsThroughFleet } from './get_config_applied_to_agent_through_fleet';

export async function findExactConfiguration({
  service,
  internalESClient,
}: {
  service: AgentConfiguration['service'];
  internalESClient: APMInternalESClient;
}) {
  const serviceNameFilter = service.name
    ? { term: { [SERVICE_NAME]: service.name } }
    : { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } };

  const environmentFilter = service.environment
    ? { term: { [SERVICE_ENVIRONMENT]: service.environment } }
    : { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } };

  const params = {
    index: APM_AGENT_CONFIGURATION_INDEX,
    body: {
      query: {
        bool: { filter: [serviceNameFilter, environmentFilter] },
      },
    },
  };

  const [agentConfig, configsAppliedToAgentsThroughFleet] = await Promise.all([
    internalESClient.search<AgentConfiguration, typeof params>(
      'find_exact_agent_configuration',
      params
    ),
    getConfigsAppliedToAgentsThroughFleet(internalESClient),
  ]);

  const hit = agentConfig.hits.hits[0] as
    | SearchHit<AgentConfiguration>
    | undefined;

  if (!hit) {
    return;
  }

  return {
    id: hit._id,
    ...convertConfigSettingsToString(hit)._source,
    applied_by_agent:
      hit._source.applied_by_agent ||
      configsAppliedToAgentsThroughFleet.hasOwnProperty(hit._source.etag),
  };
}
