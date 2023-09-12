/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingESField } from './elasticsearch';
import {
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from './profiling';

export interface ProfilingStatusResponse {
  profiling: {
    enabled: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
    pre_8_9_1_data: boolean;
  };
}

interface ProfilingEvents {
  [key: string]: number;
}

export interface ProfilingStackTrace {
  ['file_ids']: string[];
  ['frame_ids']: string[];
  ['address_or_lines']: number[];
  ['type_ids']: number[];
}

interface ProfilingStackTraces {
  [key: string]: ProfilingStackTrace;
}

export interface ProfilingStackFrame {
  ['file_name']: string[];
  ['function_name']: string[];
  ['function_offset']: number[];
  ['line_number']: number[];
}

interface ProfilingStackFrames {
  [key: string]: ProfilingStackFrame;
}

interface ProfilingExecutables {
  [key: string]: string;
}

export interface StackTraceResponse {
  ['stack_trace_events']?: ProfilingEvents;
  ['stack_traces']?: ProfilingStackTraces;
  ['stack_frames']?: ProfilingStackFrames;
  ['executables']?: ProfilingExecutables;
  ['total_frames']: number;
  ['sampling_rate']: number;
}

export interface DecodedStackTraceResponse {
  events: Map<StackTraceID, number>;
  stackTraces: Map<StackTraceID, StackTrace>;
  stackFrames: Map<StackFrameID, StackFrame>;
  executables: Map<FileID, Executable>;
  totalFrames: number;
  samplingRate: number;
}

export const makeFrameID = (frameID: string, n: number): string => {
  return n === 0 ? frameID : frameID + ';' + n.toString();
};

// createInlineTrace builds a new StackTrace with inline frames.
const createInlineTrace = (
  trace: ProfilingStackTrace,
  frames: Map<StackFrameID, StackFrame>
): StackTrace => {
  // The arrays need to be extended with the inline frame information.
  const frameIDs: string[] = [];
  const fileIDs: string[] = [];
  const addressOrLines: number[] = [];
  const typeIDs: number[] = [];

  for (let i = 0; i < trace.frame_ids.length; i++) {
    const frameID = trace.frame_ids[i];
    frameIDs.push(frameID);
    fileIDs.push(trace.file_ids[i]);
    addressOrLines.push(trace.address_or_lines[i]);
    typeIDs.push(trace.type_ids[i]);

    for (let j = 1; ; j++) {
      const inlineID = makeFrameID(frameID, j);
      const frame = frames.get(inlineID);
      if (!frame) {
        break;
      }
      frameIDs.push(inlineID);
      fileIDs.push(trace.file_ids[i]);
      addressOrLines.push(trace.address_or_lines[i]);
      typeIDs.push(trace.type_ids[i]);
    }
  }

  return {
    FrameIDs: frameIDs,
    FileIDs: fileIDs,
    AddressOrLines: addressOrLines,
    Types: typeIDs,
  } as StackTrace;
};

export function decodeStackTraceResponse(response: StackTraceResponse): DecodedStackTraceResponse {
  const stackTraceEvents: Map<StackTraceID, number> = new Map();
  for (const [key, value] of Object.entries(response.stack_trace_events ?? {})) {
    stackTraceEvents.set(key, value);
  }

  const stackFrames: Map<StackFrameID, StackFrame> = new Map();
  for (const [frameID, frame] of Object.entries(response.stack_frames ?? {})) {
    // Each field in a stackframe is represented by an array. This is
    // necessary to support inline frames.
    //
    // We store the inlined frames with a modified (and unique) ID.
    // We can do so since we don't display the frame IDs.
    for (let i = 0; i < frame.function_name.length; i++) {
      stackFrames.set(makeFrameID(frameID, i), {
        FileName: frame.file_name[i],
        FunctionName: frame.function_name[i],
        FunctionOffset: frame.function_offset[i],
        LineNumber: frame.line_number[i],
        Inline: i > 0,
      } as StackFrame);
    }
  }

  const stackTraces: Map<StackTraceID, StackTrace> = new Map();
  for (const [traceID, trace] of Object.entries(response.stack_traces ?? {})) {
    stackTraces.set(traceID, createInlineTrace(trace, stackFrames));
  }

  const executables: Map<FileID, Executable> = new Map();
  for (const [key, value] of Object.entries(response.executables ?? {})) {
    executables.set(key, {
      FileName: value,
    } as Executable);
  }

  return {
    events: stackTraceEvents,
    stackTraces,
    stackFrames,
    executables,
    totalFrames: response.total_frames,
    samplingRate: response.sampling_rate,
  };
}

export enum StackTracesDisplayOption {
  StackTraces = 'stackTraces',
  Percentage = 'percentage',
}

export enum TopNType {
  Containers = 'containers',
  Deployments = 'deployments',
  Threads = 'threads',
  Hosts = 'hosts',
  Traces = 'traces',
}

export function getFieldNameForTopNType(type: TopNType): string {
  return {
    [TopNType.Containers]: ProfilingESField.ContainerName,
    [TopNType.Deployments]: ProfilingESField.OrchestratorResourceName,
    [TopNType.Threads]: ProfilingESField.ProcessThreadName,
    [TopNType.Hosts]: ProfilingESField.HostID,
    [TopNType.Traces]: ProfilingESField.StacktraceID,
  }[type];
}
