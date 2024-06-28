/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getAgentConfigEtagMetrics } from './get_agent_config_etag_metrics';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { APM_AGENT_CONFIGURATION_INDEX } from '../apm_indices/apm_system_index_constants';

export async function listConfigurations({
  internalESClient,
  apmEventClient,
  apmIndices,
}: {
  internalESClient: APMInternalESClient;
  apmEventClient?: APMEventClient;
  apmIndices: APMIndices;
}) {
  const params = {
    index: APM_AGENT_CONFIGURATION_INDEX,
    size: 200,
  };

  const [agentConfigs, appliedEtags = []] = await Promise.all([
    internalESClient.search<AgentConfiguration>('list_agent_configuration', params),
    apmEventClient ? getAgentConfigEtagMetrics(apmEventClient) : undefined,
  ]);

  return agentConfigs.hits.hits.map(convertConfigSettingsToString).map((hit) => {
    return {
      ...hit._source,
      applied_by_agent: hit._source.applied_by_agent || appliedEtags.includes(hit._source.etag),
    };
  });
}
