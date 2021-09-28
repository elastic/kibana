/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isIndexNotFoundError = (error: unknown): boolean =>
  (
    error as {
      attributes?: { caused_by?: { type?: string } };
    }
  ).attributes?.caused_by?.type === 'index_not_found_exception';
