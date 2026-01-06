/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_AGENT_CONFIGURATION_INDEX } from '@kbn/apm-sources-access-plugin/server';
import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export async function markError({
  id,
  body,
  error,
  internalESClient,
}: {
  id: string;
  body: AgentConfiguration;
  error: string;
  internalESClient: APMInternalESClient;
}) {
  const params = {
    index: APM_AGENT_CONFIGURATION_INDEX,
    id, // by specifying the `id` elasticsearch will do an "upsert"
    body: {
      ...body,
      applied_by_agent: false,
      error,
    },
  };

  return internalESClient.index<AgentConfiguration>('mark_configuration_error', params);
}
