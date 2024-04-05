/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFunctionResponseMessage } from './create_function_response_message';

export function createFunctionResponseError({
  name,
  error,
  message,
}: {
  name: string;
  error: Error;
  message?: string;
}) {
  return createFunctionResponseMessage({
    name,
    content: {
      error: {
        ...error,
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      },
      message: message || error.message,
    },
  });
}
