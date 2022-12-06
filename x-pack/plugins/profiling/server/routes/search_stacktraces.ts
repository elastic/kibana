/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { DedotObject } from '../../common/elasticsearch';
import {
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from '../../common/profiling';
import { ProjectTimeQuery } from './query';

interface ProfilingEvents {
  [key: string]: number;
}

type ProfilingStackTrace = DedotObject<{
  ['file_ids']: string[];
  ['frame_ids']: string[];
  ['address_or_lines']: number[];
  ['type_ids']: number[];
}>;

interface ProfilingStackTraces {
  [key: string]: ProfilingStackTrace;
}

type ProfilingStackFrame = DedotObject<{
  ['file_name']: string | undefined;
  ['function_name']: string;
  ['function_offset']: number | undefined;
  ['line_number']: number | undefined;
  ['source_type']: number | undefined;
}>;

interface ProfilingStackFrames {
  [key: string]: ProfilingStackFrame;
}

interface ProfilingExecutables {
  [key: string]: string;
}

type StackTraceResponse = DedotObject<{
  ['stack_trace_events']: ProfilingEvents;
  ['stack_traces']: ProfilingStackTraces;
  ['stack_frames']: ProfilingStackFrames;
  ['executables']: ProfilingExecutables;
  ['total_frames']: number;
}>;

export async function searchStackTraces({
  logger,
  client,
  filter,
  sampleSize,
}: {
  logger: Logger;
  client: ElasticsearchClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
}) {
  return withProfilingSpan('search_stack_traces', async () => {
    const response = await client.transport.request<StackTraceResponse>({
      method: 'POST',
      path: encodeURI('/_profiling/stacktraces'),
      body: {
        sample_size: sampleSize,
        query: filter,
      },
    });

    const stackTraceEvents: Map<StackTraceID, number> = new Map(
      Object.entries(response.stack_trace_events)
    );

    const stackTraces: Map<StackTraceID, StackTrace> = new Map();
    for (const [key, value] of Object.entries(response.stack_traces)) {
      stackTraces.set(key, {
        FrameIDs: value.frame_ids,
        FileIDs: value.file_ids,
        AddressOrLines: value.address_or_lines,
        Types: value.type_ids,
      } as StackTrace);
    }

    const stackFrames: Map<StackFrameID, StackFrame> = new Map();
    for (const [key, value] of Object.entries(response.stack_frames)) {
      stackFrames.set(key, {
        FileName: value.file_name,
        FunctionName: value.function_name,
        FunctionOffset: value.function_offset,
        LineNumber: value.line_number,
        SourceType: value.source_type,
      } as StackFrame);
    }

    const executables: Map<FileID, Executable> = new Map();
    for (const [key, value] of Object.entries(response.executables)) {
      executables.set(key, {
        FileName: value,
      } as Executable);
    }

    return {
      stackTraceEvents,
      stackTraces,
      stackFrames,
      executables,
      totalFrames: response.total_frames,
    };
  });
}
