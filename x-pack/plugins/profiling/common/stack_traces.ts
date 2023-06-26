/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingESField } from './elasticsearch';

export interface ProfilingStatusResponse {
  profiling: {
    enabled: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
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
