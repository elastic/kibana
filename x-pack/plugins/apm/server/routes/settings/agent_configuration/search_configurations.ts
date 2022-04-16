/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@kbn/core/types/elasticsearch';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../lib/helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { convertConfigSettingsToString } from './convert_settings_to_string';

export async function searchConfigurations({
  service,
  setup,
}: {
  service: AgentConfiguration['service'];
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  // In the following `constant_score` is being used to disable IDF calculation (where frequency of a term influences scoring).
  // Additionally a boost has been added to service.name to ensure it scores higher.
  // If there is tie between a config with a matching service.name and a config with a matching environment, the config that matches service.name wins
  const serviceNameFilter = service.name
    ? [
        {
          constant_score: {
            filter: { term: { [SERVICE_NAME]: service.name } },
            boost: 2,
          },
        },
      ]
    : [];

  const environmentFilter = service.environment
    ? [
        {
          constant_score: {
            filter: { term: { [SERVICE_ENVIRONMENT]: service.environment } },
            boost: 1,
          },
        },
      ]
    : [];

  const params = {
    index: indices.apmAgentConfigurationIndex,
    body: {
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            ...serviceNameFilter,
            ...environmentFilter,
            { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } },
            {
              bool: {
                must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }],
              },
            },
          ],
        },
      },
    },
  };

  const resp = await internalClient.search<AgentConfiguration, typeof params>(
    'search_agent_configurations',
    params
  );

  const hit = resp.hits.hits[0] as SearchHit<AgentConfiguration> | undefined;

  if (!hit) {
    return;
  }

  return convertConfigSettingsToString(hit);
}
