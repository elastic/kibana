/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '../../../../../src/core/server';
import { metricQueryStub, runQuery } from './fetcher_helpers';

describe('runQuery', () => {
  it('should gracefully handle query functions that reject', async () => {
    const res = await runQuery(
      () => Promise.reject(new Error('hi')) as ReturnType<ElasticsearchClient['search']>
    );
    expect(res).toEqual(metricQueryStub);
  });

  it('should pass back the value evaluated in the callback on success', async () => {
    const stubValue = {};
    const res = await runQuery(
      () => Promise.resolve(stubValue) as ReturnType<ElasticsearchClient['search']>
    );
    expect(res).toEqual(stubValue);
  });
});
