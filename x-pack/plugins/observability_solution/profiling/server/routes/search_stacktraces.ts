/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { decodeStackTraceResponse } from '@kbn/profiling-utils';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { ProjectTimeQuery } from './query';

export async function searchStackTraces({
  client,
  filter,
  sampleSize,
  durationSeconds,
  showErrorFrames,
}: {
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
  durationSeconds: number;
  showErrorFrames: boolean;
}) {
  const response = await client.profilingStacktraces({
    query: filter,
    sampleSize,
    durationSeconds,
  });

  return decodeStackTraceResponse(response, showErrorFrames);
}
