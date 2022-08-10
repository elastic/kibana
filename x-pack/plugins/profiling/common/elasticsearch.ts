/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProfilingESEvent {
  '@timestamp': string;
  ContainerName: string;
  ThreadName: string;
  Count: number;
  HostID: string;
  PodName: string;
  ProjectID: string;
  StackTraceID: string;
}

export interface ProfilingStackTrace {
  FrameIDs: string[];
  LastSeen: number;
  Types: number;
}

export interface ProfilingStackFrame {
  FileName: string;
  FunctionName: string;
  LineNumber: number;
  FunctionOffset: number;
  SourceType: number;
}

export interface ProfilingExecutable {
  BuildID: string;
  FileName: string;
  LastSeen: string;
}
