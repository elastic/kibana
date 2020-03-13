/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Response, Request, ExecutionError, JsonObject } from '../common/types';

export function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export function buildRequestPayload(
  code: string,
  context: string,
  contextSetup: Record<string, string>
) {
  const request: Request = {
    script: {
      source: code,
    },
  };
  if (contextSetup.params) {
    request.script.params = parseJSON(contextSetup?.params);
  }
  if (context === 'filter' || context === 'score') {
    request.context = context;
    request.context_setup = {
      index: contextSetup.index,
      document: parseJSON(contextSetup.document),
    };
    return request;
  }

  return request;
}

/**
 * Retrieves a value from the browsers local storage, provides a default
 * if none is given. With the parse flag you can parse textual JSON to an object
 */
export function getFromLocalStorage(
  key: string,
  defaultValue: string | JsonObject = '',
  parse = false
) {
  const value = localStorage.getItem(key);
  if (value && parse) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  } else if (value) {
    return value;
  }
  return defaultValue;
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
