/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

// We're not wrapping this function with a span as it is not blocking the request
export async function markAppliedByAgent({
  id,
  body,
  internalESClient,
}: {
  id: string;
  body: AgentConfiguration;
  internalESClient: APMInternalESClient;
}) {
  const params = {
    index: internalESClient.apmIndices.apmAgentConfigurationIndex,
    id, // by specifying the `id` elasticsearch will do an "upsert"
    body: {
      ...body,
      applied_by_agent: true,
    },
  };

  return internalESClient.index<AgentConfiguration>(
    'mark_configuration_applied_by_agent',
    params
  );
}
