/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_ERROR_MESSAGE_LEN = 256;
const MAX_STACK_HEAD_LEN = 800;

export interface DagreLayoutFailureDiagnostics {
  error_name: string;
  /** Truncated Error.message (no service names / topology) */
  error_message: string;
  /** First few stack lines, flattened; helps confirm Dagre internals vs minified chunk */
  stack_head: string;
}

function truncateSingleLine(str: string, max: number): string {
  const single = str.replace(/\s+/g, ' ').trim();
  return single.length <= max ? single : single.slice(0, max);
}

/**
 * Builds privacy-safe fields for telemetry when Dagre.layout throws.
 * Avoids sending the graph; message/stack come from the library only.
 */
export function getDagreLayoutFailureDiagnostics(error: unknown): DagreLayoutFailureDiagnostics {
  if (error instanceof Error) {
    const stackHead = error.stack
      ? truncateSingleLine(error.stack.split('\n').slice(0, 6).join(' | '), MAX_STACK_HEAD_LEN)
      : '';

    return {
      error_name: error.name,
      error_message: truncateSingleLine(error.message, MAX_ERROR_MESSAGE_LEN),
      stack_head: stackHead,
    };
  }

  const asString = typeof error === 'string' ? error : String(error);

  return {
    error_name: 'unknown',
    error_message: truncateSingleLine(asString, MAX_ERROR_MESSAGE_LEN),
    stack_head: '',
  };
}
