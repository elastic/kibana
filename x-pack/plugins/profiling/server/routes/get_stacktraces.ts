/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { profilingElasticsearchPlugin } from '@kbn/observability-plugin/common';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { ProjectTimeQuery } from './query';
import { searchStackTraces } from './search_stacktraces';

export async function getStackTraces({
  context,
  logger,
  client,
  filter,
  sampleSize,
}: {
  context: RequestHandlerContext;
  logger: Logger;
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
}) {
  const core = await context.core;
  const useElasticsearchPlugin = await core.uiSettings.client.get<boolean>(
    profilingElasticsearchPlugin
  );

  if (useElasticsearchPlugin) {
    return await searchStackTraces({
      client,
      filter,
      sampleSize,
    });
  }

  return await getExecutablesAndStackTraces({
    logger,
    client,
    filter,
    sampleSize,
  });
}
