/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from '../../common/profiling';
import { StackTraceResponse } from '../../common/stack_traces';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { ProjectTimeQuery } from './query';

export function decodeStackTraceResponse(response: StackTraceResponse) {
  const stackTraceEvents: Map<StackTraceID, number> = new Map();
  for (const [key, value] of Object.entries(response.stack_trace_events ?? {})) {
    stackTraceEvents.set(key, value);
  }

  const stackTraces: Map<StackTraceID, StackTrace> = new Map();
  for (const [key, value] of Object.entries(response.stack_traces ?? {})) {
    stackTraces.set(key, {
      FrameIDs: value.frame_ids,
      FileIDs: value.file_ids,
      AddressOrLines: value.address_or_lines,
      Types: value.type_ids,
    } as StackTrace);
  }

  const stackFrames: Map<StackFrameID, StackFrame> = new Map();
  for (const [key, value] of Object.entries(response.stack_frames ?? {})) {
    // Each field in a stackframe is represented by an array. This is
    // necessary to support inline frames.
    //
    // We only take the first available inline stackframe until the UI
    // can support all of them.
    stackFrames.set(key, {
      FileName: value.file_name[0],
      FunctionName: value.function_name[0],
      FunctionOffset: value.function_offset[0],
      LineNumber: value.line_number[0],
    } as StackFrame);
  }

  const executables: Map<FileID, Executable> = new Map();
  for (const [key, value] of Object.entries(response.executables ?? {})) {
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
}

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
