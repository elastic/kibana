/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProfilingESEvent {
  '@timestamp': string;
  'container.name': string;
  'process.thread.name': string;
  'Stacktrace.count': number;
  'host.id': string;
  'orchestrator.resource.name': string;
  'service.name': string;
  'Stacktrace.id': string;
}

export interface ProfilingStackTrace {
  '@timestamp': number;
  'Stacktrace.frame.ids': string[];
  'Stacktrace.frame.types': number;
}

export interface ProfilingStackFrame {
  'Stackframe.file.name': string;
  'Stackframe.function.name': string;
  'Stackframe.line.number': number;
  'Stackframe.function.offset': number;
  'Stackframe.source.type': number;
}

export interface ProfilingExecutable {
  'Executable.build.id': string;
  'Executable.file.name': string;
  '@timestamp': string;
}
