/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphRecursionError } from '@langchain/langgraph';
import { RecursionLimitError } from '../lib/errors';

export function handleRecursionError(err: Error, errorCode: string) {
  if (err instanceof GraphRecursionError) {
    throw new RecursionLimitError(err.message, errorCode);
  }
  throw err;
}
