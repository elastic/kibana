/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { APM_AGENT_CONFIGURATION_INDEX } from '@kbn/apm-sources-access-plugin/server';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getAgentConfigEtagMetrics } from './get_agent_config_etag_metrics';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

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
