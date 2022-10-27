/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getConfigsAppliedToAgentsThroughFleet } from './get_config_applied_to_agent_through_fleet';
import { ApmIndicesConfig } from '../apm_indices/get_apm_indices';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export async function listConfigurations({
  internalESClient,
  indices,
}: {
  internalESClient: APMInternalESClient;
  indices: ApmIndicesConfig;
}) {
  const params = {
    index: indices.apmAgentConfigurationIndex,
    size: 200,
  };

  const [agentConfigs, configsAppliedToAgentsThroughFleet] = await Promise.all([
    internalESClient.search<AgentConfiguration>(
      'list_agent_configuration',
      params
    ),
    getConfigsAppliedToAgentsThroughFleet({ internalESClient, indices }),
  ]);

  return agentConfigs.hits.hits
    .map(convertConfigSettingsToString)
    .map((hit) => {
      return {
        ...hit._source,
        applied_by_agent:
          hit._source.applied_by_agent ||
          configsAppliedToAgentsThroughFleet.hasOwnProperty(hit._source.etag),
      };
    });
}
