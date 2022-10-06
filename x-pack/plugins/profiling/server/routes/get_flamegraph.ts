/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { createCalleeTree } from '../../common/callee';
import { BaseFlameGraph, createBaseFlameGraph } from '../../common/flamegraph';
import type { ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { createCommonFilter } from './query';

export interface FlameGraphOptions {
  logger: Logger;
  timeFrom: number;
  timeTo: number;
  kuery: string;
  client: ProfilingESClient;
}

export type FlameGraphResponse = BaseFlameGraph;

export async function getFlameGraph({
  logger,
  client,
  kuery,
  timeFrom,
  timeTo,
}: FlameGraphOptions) {
  const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

  const filter = createCommonFilter({
    timeFrom,
    timeTo,
    kuery,
  });
  const totalSeconds = timeTo - timeFrom;

  const { stackTraceEvents, stackTraces, executables, stackFrames, totalFrames } =
    await getExecutablesAndStackTraces({
      logger,
      client,
      filter,
      sampleSize: targetSampleSize,
    });

  const flamegraph = await withProfilingSpan('create_flamegraph', async () => {
    const t0 = Date.now();
    const tree = createCalleeTree(
      stackTraceEvents,
      stackTraces,
      stackFrames,
      executables,
      totalFrames
    );
    logger.info(`creating callee tree took ${Date.now() - t0} ms`);

    const t1 = Date.now();
    const fg = createBaseFlameGraph(tree, totalSeconds);
    logger.info(`creating flamegraph took ${Date.now() - t1} ms`);

    return fg;
  });

  logger.info('returning payload response to client');

  return flamegraph;
}
