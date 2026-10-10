/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';

export function isIndexNotFoundError(error: unknown): boolean {
  const elasticsearchError =
    error instanceof WrappedElasticsearchClientError ? error.originalError : error;

  return (
    elasticsearchError instanceof errors.ResponseError &&
    elasticsearchError.body?.error?.type === 'index_not_found_exception'
  );
}
