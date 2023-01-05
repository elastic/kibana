/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { INDEX_EVENTS } from '../../common';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { downsampleEventsRandomly, findDownsampledIndex } from './downsampling';
import { ProjectTimeQuery } from './query';
import {
  mgetExecutables,
  mgetStackFrames,
  mgetStackTraces,
  searchEventsGroupByStackTrace,
} from './stacktrace';

export async function getExecutablesAndStackTraces({
  logger,
  client,
  filter,
  sampleSize,
}: {
  logger: Logger;
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
}) {
  return withProfilingSpan('get_executables_and_stack_traces', async () => {
    const eventsIndex = await findDownsampledIndex({
      logger,
      client,
      index: INDEX_EVENTS,
      filter,
      sampleSize,
    });

    const { totalCount, stackTraceEvents } = await searchEventsGroupByStackTrace({
      logger,
      client,
      index: eventsIndex,
      filter,
    });

    // Manual downsampling if totalCount exceeds sampleSize by 10%.
    let p = 1.0;
    if (totalCount > sampleSize * 1.1) {
      p = sampleSize / totalCount;
      logger.info('downsampling events with p=' + p);
      const t0 = Date.now();
      const downsampledTotalCount = downsampleEventsRandomly(
        stackTraceEvents,
        p,
        filter.toString()
      );
      logger.info(`downsampling events took ${Date.now() - t0} ms`);
      logger.info('downsampled total count: ' + downsampledTotalCount);
      logger.info('unique downsampled stacktraces: ' + stackTraceEvents.size);
    }

    // Adjust the sample counts from down-sampled to fully sampled.
    // Be aware that downsampling drops entries from stackTraceEvents, so that
    // the sum of the upscaled count values is less that totalCount.
    for (const [id, count] of stackTraceEvents) {
      stackTraceEvents.set(id, Math.floor(count / (eventsIndex.sampleRate * p)));
    }

    const { stackTraces, totalFrames, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces({
      logger,
      client,
      events: stackTraceEvents,
    });

    return withProfilingSpan('get_stackframes_and_executables', () =>
      Promise.all([
        mgetStackFrames({ logger, client, stackFrameIDs: stackFrameDocIDs }),
        mgetExecutables({ logger, client, executableIDs: executableDocIDs }),
      ])
    ).then(([stackFrames, executables]) => {
      return {
        stackTraces,
        executables,
        stackFrames,
        stackTraceEvents,
        totalCount,
        totalFrames,
        eventsIndex,
      };
    });
  });
}
