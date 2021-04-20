/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../helpers/setup_request';

export async function deleteConfiguration({
  configurationId,
  setup,
}: {
  configurationId: string;
  setup: Setup;
}) {
  return withApmSpan('delete_agent_configuration', async () => {
    const { internalClient, indices } = setup;

    const params = {
      refresh: 'wait_for' as const,
      index: indices.apmAgentConfigurationIndex,
      id: configurationId,
    };

    return internalClient.delete(params);
  });
}
