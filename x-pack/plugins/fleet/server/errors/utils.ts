/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';

export function isESClientError(error: unknown): error is ResponseError {
  return error instanceof ResponseError;
}

export const isElasticsearchVersionConflictError = (error: Error): boolean => {
  return isESClientError(error) && error.meta.statusCode === 409;
};
