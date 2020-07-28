/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { ESSearchHit } from '../../../../typings/elasticsearch';
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
    params
  );

  const hit = resp.hits.hits[0] as ESSearchHit<AgentConfiguration> | undefined;

  if (!hit) {
    return;
  }

  return convertConfigSettingsToString(hit);
}
