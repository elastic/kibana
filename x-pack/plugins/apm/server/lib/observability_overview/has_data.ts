/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';

export async function hasData({ setup }: { setup: Setup }) {
  const { client, indices } = setup;
  try {
    const params = {
      index: [
        indices['apm_oss.transactionIndices'],
        indices['apm_oss.errorIndices'],
        indices['apm_oss.metricsIndices'],
      ],
      terminateAfter: 1,
      size: 0,
    };

    const response = await client.search(params);
    return response.hits.total.value > 0;
  } catch (e) {
    return false;
  }
}
