/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/es-types';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { APM_AGENT_CONFIGURATION_INDEX } from '../apm_indices/apm_system_index_constants';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getAgentConfigEtagMetrics } from './get_agent_config_etag_metrics';

export async function findExactConfiguration({
  service,
  internalESClient,
  apmEventClient,
}: {
  service: AgentConfiguration['service'];
  internalESClient: APMInternalESClient;
  apmEventClient: APMEventClient;
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

  const agentConfig = await internalESClient.search<AgentConfiguration, typeof params>(
    'find_exact_agent_configuration',
    params
  );

  const hit = agentConfig.hits.hits[0] as SearchHit<AgentConfiguration> | undefined;

  if (!hit) {
    return;
  }

  const appliedByAgent = await getIsAppliedByAgent({
    apmEventClient,
    agentConfiguration: hit._source,
  });

  return {
    id: hit._id,
    ...convertConfigSettingsToString(hit)._source,
    applied_by_agent: appliedByAgent,
  };
}

async function getIsAppliedByAgent({
  apmEventClient,
  agentConfiguration,
}: {
  apmEventClient: APMEventClient;
  agentConfiguration: AgentConfiguration;
}) {
  if (agentConfiguration.applied_by_agent) {
    return true;
  }

  const appliedEtags = await getAgentConfigEtagMetrics(apmEventClient, agentConfiguration.etag);

  return appliedEtags.includes(agentConfiguration.etag);
}
