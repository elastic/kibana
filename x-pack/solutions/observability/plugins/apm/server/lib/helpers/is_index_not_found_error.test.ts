/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import { WrappedElasticsearchClientError as ObservabilityWrappedError } from '@kbn/observability-plugin/server';
import { WrappedElasticsearchClientError as ApmWrappedError } from '@kbn/observability-utils-server/es/unwrap_es_response';
import { isIndexNotFoundError } from './is_index_not_found_error';

function createEsError(type: string, statusCode: number) {
  return new errors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
    body: { error: { type, reason: 'test error' } },
  } as TransportResult);
}

describe('isIndexNotFoundError', () => {
  it('recognizes an unwrapped missing-index response', () => {
    expect(isIndexNotFoundError(createEsError('index_not_found_exception', 404))).toBe(true);
  });

  it('does not recognize an unwrapped authorization error', () => {
    expect(isIndexNotFoundError(createEsError('security_exception', 403))).toBe(false);
  });

  describe.each([
    ['APM event client', ApmWrappedError],
    ['observability plugin', ObservabilityWrappedError],
  ] as const)('%s wrapper', (_name, WrappedError) => {
    it('recognizes a missing-index response', () => {
      const error = new WrappedError(createEsError('index_not_found_exception', 404));
      expect(isIndexNotFoundError(error)).toBe(true);
    });

    it('does not recognize an authorization error', () => {
      const error = new WrappedError(createEsError('security_exception', 403));
      expect(isIndexNotFoundError(error)).toBe(false);
    });

    it('does not recognize a connection error', () => {
      const error = new WrappedError(new errors.ConnectionError('connection failed'));
      expect(isIndexNotFoundError(error)).toBe(false);
    });
  });

  it.each([
    null,
    undefined,
    'index_not_found_exception',
    new Error('index_not_found_exception'),
    { body: { error: { type: 'index_not_found_exception' } } },
    { originalError: null },
    { originalError: { body: { error: { type: 'index_not_found_exception' } } } },
  ])('does not recognize unrelated or malformed input %#', (error) => {
    expect(isIndexNotFoundError(error)).toBe(false);
  });
});
