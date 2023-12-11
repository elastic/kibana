/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { APM_AGENT_CONFIGURATION_INDEX } from '../apm_indices/apm_system_index_constants';

export async function deleteConfiguration({
  configurationId,
  internalESClient,
}: {
  configurationId: string;
  internalESClient: APMInternalESClient;
}) {
  const params = {
    refresh: 'wait_for' as const,
    index: APM_AGENT_CONFIGURATION_INDEX,
    id: configurationId,
  };

  return internalESClient.delete('delete_agent_configuration', params);
}
