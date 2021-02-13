/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function listConfigurations({ setup }: { setup: Setup }) {
  const { internalClient, indices } = setup;

  const params = {
    index: indices.apmAgentConfigurationIndex,
    size: 200,
  };

  const resp = await withApmSpan('list_agent_configurations', () =>
    internalClient.search<AgentConfiguration>(params)
  );

  return resp.hits.hits
    .map(convertConfigSettingsToString)
    .map((hit) => hit._source);
}
