/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@kbn/core/types/elasticsearch';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../lib/helpers/setup_request';
import { convertConfigSettingsToString } from './convert_settings_to_string';

export async function findExactConfiguration({
  service,
  setup,
}: {
  service: AgentConfiguration['service'];
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const serviceNameFilter = service.name
    ? { term: { [SERVICE_NAME]: service.name } }
    : { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } };

  const environmentFilter = service.environment
    ? { term: { [SERVICE_ENVIRONMENT]: service.environment } }
    : { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } };

  const params = {
    index: indices.apmAgentConfigurationIndex,
    body: {
      query: {
        bool: { filter: [serviceNameFilter, environmentFilter] },
      },
    },
  };

  const resp = await internalClient.search<AgentConfiguration, typeof params>(
    'find_exact_agent_configuration',
    params
  );

  const hit = resp.hits.hits[0] as SearchHit<AgentConfiguration> | undefined;

  if (!hit) {
    return;
  }

  return convertConfigSettingsToString(hit);
}
