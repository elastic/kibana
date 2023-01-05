/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Code that works around incompatibilities between different
// versions of Kibana / ES.
// Currently, we work with 8.1 and 8.3 and thus this code only needs
// to address the incompatibilities between those two versions.

import type { ElasticsearchClient } from '@kbn/core/server';
import { ProfilingRequestHandlerContext } from '../types';

export async function getClient(
  context: ProfilingRequestHandlerContext
): Promise<ElasticsearchClient> {
  return (await context.core).elasticsearch.client.asCurrentUser;
}
