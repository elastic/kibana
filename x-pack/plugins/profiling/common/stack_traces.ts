/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingESField } from './elasticsearch';

interface ProfilingEvents {
  [key: string]: number;
}

interface ProfilingStackTrace {
  ['file_ids']: string[];
  ['frame_ids']: string[];
  ['address_or_lines']: number[];
  ['type_ids']: number[];
}

interface ProfilingStackTraces {
  [key: string]: ProfilingStackTrace;
}

interface ProfilingStackFrame {
  ['file_name']: string | undefined;
  ['function_name']: string;
  ['function_offset']: number | undefined;
  ['line_number']: number | undefined;
  ['source_type']: number | undefined;
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
