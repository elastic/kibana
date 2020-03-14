/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestPayloadConfig, Response, ExecutionError } from '../common/types';

export function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

/**
 * Values should be preserved as strings so that floating point precision,
 * e.g. 1.0, is preserved instead of being coerced to an integer, e.g. 1.
 */
export function buildRequestPayload({
  code,
  context,
  parameters,
  index,
  document,
}: RequestPayloadConfig): string {
  const isAdvancedContext = context === 'filter' || context === 'score';
  const requestPayload = `{
  "script": {
    "source": "${code}",
    ${parameters ? `"params": ${parameters}` : ``}
  }${
    isAdvancedContext
      ? `,
  "context": ${context},
  "context_setup": {
    "index": ${index},
    "document": ${document}
  }`
      : ``
  }
}`;

  return requestPayload;
}

/**
 * Stringify a given object to JSON in a formatted way
 */
export function formatJson(json: unknown): string {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return `Invalid JSON ${String(json)}`;
  }
}

export function formatResponse(response?: Response): string {
  if (!response) {
    return '';
  }
  if (typeof response.result === 'string') {
    return response.result.replace(/\\n/g, '\n');
  } else if (response.error) {
    return formatExecutionError(response.error);
  }
  return formatJson(response);
}

export function formatExecutionError(executionErrorOrError: ExecutionError | Error): string {
  if (executionErrorOrError instanceof Error) {
    return executionErrorOrError.message;
  }

  if (
    executionErrorOrError.script_stack &&
    executionErrorOrError.caused_by &&
    executionErrorOrError.position
  ) {
    return `Unhandled Exception ${executionErrorOrError.caused_by.type}

${executionErrorOrError.caused_by.reason}

Stack:
${formatJson(executionErrorOrError.script_stack)}
`;
  }
  return formatJson(executionErrorOrError);
}
