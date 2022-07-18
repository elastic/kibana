/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { getConfigsAppliedToAgentsThroughFleet } from './get_config_applied_to_agent_through_fleet';

export async function listConfigurations({ setup }: { setup: Setup }) {
  const { internalClient, indices } = setup;

  const params = {
    index: indices.apmAgentConfigurationIndex,
    size: 200,
  };

  const [agentConfigs, configsAppliedToAgentsThroughFleet] = await Promise.all([
    internalClient.search<AgentConfiguration>(
      'list_agent_configuration',
      params
    ),
    getConfigsAppliedToAgentsThroughFleet({ setup }),
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
