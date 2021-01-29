/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent of GET /_xpack/usage?master_timeout=${TIMEOUT}
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 */
export async function getXPackUsage(esClient: ElasticsearchClient) {
  const { body } = await esClient.xpack.usage({ master_timeout: TIMEOUT });
  return body;
}
