/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';

export async function deleteCustomLink({
  customLinkId,
  setup,
}: {
  customLinkId: string;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params = {
    refresh: 'wait_for' as const,
    index: indices.apmCustomLinkIndex,
    id: customLinkId,
  };

  return internalClient.delete(params);
}
