/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeStackTraceResponse } from '../../common/stack_traces';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { ProjectTimeQuery } from './query';

export async function searchStackTraces({
  client,
  filter,
  sampleSize,
}: {
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
}) {
  const response = await client.profilingStacktraces({ query: filter, sampleSize });

  return decodeStackTraceResponse(response);
}
