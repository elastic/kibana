/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Response, ExecutionError, PayloadFormat, Payload } from '../types';

function prettifyPayload(payload = '', indentationLevel = 0) {
  const indentation = new Array(indentationLevel + 1).join(' ');
  return payload.replace(/\n/g, `\n${indentation}`);
}

/**
 * Values should be preserved as strings so that floating point precision,
 * e.g. 1.0, is preserved instead of being coerced to an integer, e.g. 1.
 */
export function formatRequestPayload(
  { code, context, parameters, index, document, query }: Partial<Payload>,
  format: PayloadFormat = PayloadFormat.UGLY
): string {
  const isAdvancedContext = context === 'filter' || context === 'score';

  let formattedCode: string | undefined;
  let formattedParameters: string | undefined;
  let formattedContext: string | undefined;
  let formattedIndex: string | undefined;
  let formattedDocument: string | undefined;
  let formattedQuery: string | undefined;

  if (format === PayloadFormat.UGLY) {
    formattedCode = JSON.stringify(code);
    formattedParameters = parameters;
    formattedContext = context;
    formattedIndex = index;
    formattedDocument = document;
    formattedQuery = query;
  } else {
    // Triple quote the code because it's multiline.
    formattedCode = `"""${prettifyPayload(code, 4)}"""`;
    formattedParameters = prettifyPayload(parameters, 4);
    formattedContext = prettifyPayload(context, 6);
    formattedIndex = prettifyPayload(index);
    formattedDocument = prettifyPayload(document, 4);
    formattedQuery = prettifyPayload(query, 4);
  }

  const requestPayload = `{
  "script": {
    "source": ${formattedCode}${
    parameters
      ? `,
    "params": ${formattedParameters}`
      : ``
  }
  }${
    isAdvancedContext
      ? `,
  "context": "${formattedContext}",
  "context_setup": {
    "index": "${formattedIndex}",
    "document": ${formattedDocument}${
          query && context === 'score'
            ? `,
    "query": ${formattedQuery}`
            : ''
        }
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
