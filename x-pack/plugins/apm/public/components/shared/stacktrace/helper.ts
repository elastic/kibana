/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';

export function parseOtelStackframe(stacktrace = ''): Stackframe[] {
  const stacktraceLines = stacktrace.split('\n');
  const stackframes: Stackframe[] = [];

  for (const line of stacktraceLines) {
    const stackframe = parseOtelStackframeLine(line.trim());
    if (stackframe) {
      stackframes.push(stackframe);
    }
  }

  return stackframes;
}

function parseOtelStackframeLine(line: string): Stackframe | null {
  // Regular expression to match the stack frame structure in the otel format
  const regex = /^\s*at\s+(.*?)\s*\((.*?)(?::(\d+)(?::(\d+))?)?\)\s*$/;
  const match = line.match(regex);

  if (!match) {
    return null;
  }

  const [, rawFunctionName, filename, lineNumber, columnNumber] = match;

  // Extract classname and function name
  const parts = rawFunctionName.split('.');
  const module = parts.slice(0, -2).join('.');
  const classname = parts.slice(0, -1).join('.');
  const functionName = parts[parts.length - 1];

  const stackframe: Stackframe = {
    library_frame: true,
    exclude_from_grouping: false,
    classname,
    function: functionName,
    module,
    filename,
    line: {
      number: lineNumber ? parseInt(lineNumber, 10) : 0,
      column: columnNumber ? parseInt(columnNumber, 10) : undefined,
    },
  };

  return stackframe;
}
