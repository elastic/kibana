/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { INDEX_EXECUTABLES, INDEX_FRAMES, INDEX_TRACES } from '../../common';
import {
  PickFlattened,
  ProfilingESField,
  ProfilingExecutable,
  ProfilingStackFrame,
  ProfilingStackTrace,
} from '../../common/elasticsearch';
import {
  emptyExecutable,
  emptyStackFrame,
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTraceID,
} from '../../common/profiling';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { workers } from '../workers';
import { DownsampledEventsIndex } from './downsampling';
import { ProjectTimeQuery } from './query';

export async function searchEventsGroupByStackTrace({
  logger,
  client,
  index,
  filter,
}: {
  logger: Logger;
  client: ProfilingESClient;
  index: DownsampledEventsIndex;
  filter: ProjectTimeQuery;
}) {
  const resEvents = await client.search('get_events_group_by_stack_trace', {
    index: index.name,
    track_total_hits: false,
    query: filter,
    aggs: {
      group_by: {
        terms: {
          // 'size' should be max 100k, but might be slightly more. Better be on the safe side.
          size: 150000,
          field: ProfilingESField.StacktraceID,
          // 'execution_hint: map' skips the slow building of ordinals that we don't need.
          // Especially with high cardinality fields, this makes aggregations really slow.
          // E.g. it reduces the latency from 70s to 0.7s on our 8.1. MVP cluster (as of 28.04.2022).
          execution_hint: 'map',
        },
        aggs: {
          count: {
            sum: {
              field: ProfilingESField.StacktraceCount,
            },
          },
        },
      },
      total_count: {
        sum: {
          field: ProfilingESField.StacktraceCount,
        },
      },
    },
    pre_filter_shard_size: 1,
    filter_path:
      'aggregations.group_by.buckets.key,aggregations.group_by.buckets.count,aggregations.total_count,_shards.failures',
  });

  const totalCount = resEvents.aggregations?.total_count.value ?? 0;
  const stackTraceEvents = new Map<StackTraceID, number>();

  resEvents.aggregations?.group_by?.buckets.forEach((item) => {
    const traceid: StackTraceID = String(item.key);
    stackTraceEvents.set(traceid, item.count.value ?? 0);
  });

  logger.info('events total count: ' + totalCount);
  logger.info('unique stacktraces: ' + stackTraceEvents.size);

  return { totalCount, stackTraceEvents };
}

export async function mgetStackTraces({
  logger,
  client,
  events,
}: {
  logger: Logger;
  client: ProfilingESClient;
  events: Map<StackTraceID, number>;
}) {
  const stackTraceIDs = [...events.keys()];

  const stacktraceResponse = await withProfilingSpan('mget_stacktraces', () =>
    client.mget<
      PickFlattened<
        ProfilingStackTrace,
        ProfilingESField.StacktraceFrameIDs | ProfilingESField.StacktraceFrameTypes
      >
    >('mget_stacktraces_chunk', {
      index: INDEX_TRACES,
      ids: stackTraceIDs,
      realtime: true,
      _source_includes: [
        ProfilingESField.StacktraceFrameIDs,
        ProfilingESField.StacktraceFrameTypes,
      ],
    })
  );

  const { metrics, ...result } = await withProfilingSpan('parse_stacktraces', () =>
    workers.parseStacktraces({
      stacktraces: stacktraceResponse.docs,
      events,
    })
  );

  logger.info(`processing data took ${metrics.took} ms`);

  if (metrics.averageSize !== undefined) {
    logger.info('Average size of stacktrace: ' + metrics.averageSize);
  }

  if (metrics.missing > 0) {
    logger.info('failed to find ' + metrics.missing + ' stacktraces (todo: find out why)');
  }

  return result;
}

export async function mgetStackFrames({
  logger,
  client,
  stackFrameIDs,
}: {
  logger: Logger;
  client: ProfilingESClient;
  stackFrameIDs: Set<string>;
}): Promise<Map<StackFrameID, StackFrame>> {
  const stackFrames = new Map<StackFrameID, StackFrame>();

  if (stackFrameIDs.size === 0) {
    return stackFrames;
  }

  const resStackFrames = await client.mget<ProfilingStackFrame>('mget_stackframes', {
    index: INDEX_FRAMES,
    ids: [...stackFrameIDs],
    realtime: true,
  });

  // Create a lookup map StackFrameID -> StackFrame.
  let framesFound = 0;
  const t0 = Date.now();
  const docs = resStackFrames.docs;
  for (const frame of docs) {
    if ('error' in frame) {
      continue;
    }
    if (frame.found) {
      stackFrames.set(frame._id, {
        FileName: frame._source!.Stackframe.file?.name,
        FunctionName: frame._source!.Stackframe.function?.name,
        FunctionOffset: frame._source!.Stackframe.function?.offset,
        LineNumber: frame._source!.Stackframe.line?.number,
        SourceType: frame._source!.Stackframe.source?.type,
      });
      framesFound++;
    } else {
      stackFrames.set(frame._id, emptyStackFrame);
    }
  }
  logger.info(`processing data took ${Date.now() - t0} ms`);

  logger.info('found ' + framesFound + ' / ' + stackFrameIDs.size + ' frames');

  return stackFrames;
}

export async function mgetExecutables({
  logger,
  client,
  executableIDs,
}: {
  logger: Logger;
  client: ProfilingESClient;
  executableIDs: Set<string>;
}): Promise<Map<FileID, Executable>> {
  const executables = new Map<FileID, Executable>();

  if (executableIDs.size === 0) {
    return executables;
  }

  const resExecutables = await client.mget<ProfilingExecutable>('mget_executables', {
    index: INDEX_EXECUTABLES,
    ids: [...executableIDs],
    _source_includes: [ProfilingESField.ExecutableFileName],
  });

  // Create a lookup map StackFrameID -> StackFrame.
  let exeFound = 0;
  const t0 = Date.now();
  const docs = resExecutables.docs;
  for (const exe of docs) {
    if ('error' in exe) {
      continue;
    }
    if (exe.found) {
      executables.set(exe._id, {
        FileName: exe._source!.Executable.file.name,
      });
      exeFound++;
    } else {
      executables.set(exe._id, emptyExecutable);
    }
  }
  logger.info(`processing data took ${Date.now() - t0} ms`);

  logger.info('found ' + exeFound + ' / ' + executableIDs.size + ' executables');

  return executables;
}
