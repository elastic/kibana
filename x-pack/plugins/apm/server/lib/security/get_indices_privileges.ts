/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import { Setup } from '../helpers/setup_request';

export async function getIndicesPrivileges(setup: Setup, logger: Logger) {
  const { client, indices } = setup;
  try {
    const response = await client.hasPrivileges({
      index: [
        {
          names: [
            indices['apm_oss.errorIndices'],
            indices['apm_oss.metricsIndices'],
            indices['apm_oss.transactionIndices'],
            indices['apm_oss.spanIndices']
          ],
          privileges: ['read']
        }
      ]
    });
    return response.index;
  } catch (err) {
    logger.warn(`Failed to fetch indices privileges. Error: ${err.message}`);
  }
}
