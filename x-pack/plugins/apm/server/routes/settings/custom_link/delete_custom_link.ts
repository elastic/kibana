/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { APM_CUSTOM_LINK_INDEX } from '../apm_indices/apm_system_index_constants';

export function deleteCustomLink({
  customLinkId,
  internalESClient,
}: {
  customLinkId: string;
  internalESClient: APMInternalESClient;
}) {
  const params = {
    refresh: 'wait_for' as const,
    index: APM_CUSTOM_LINK_INDEX,
    id: customLinkId,
  };

  return internalESClient.delete('delete_custom_link', params);
}
