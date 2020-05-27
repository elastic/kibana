/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRollupSearchRequest } from './rollup_search_request';

class AbstractSearchRequest {
  indexPattern = 'indexPattern';
  callWithRequest = jest.fn(({ body }) => Promise.resolve(body));
}

describe('Rollup search request', () => {
  let RollupSearchRequest;

  beforeEach(() => {
    RollupSearchRequest = getRollupSearchRequest(AbstractSearchRequest);
  });

  test('should create instance of RollupSearchRequest', () => {
    const rollupSearchRequest = new RollupSearchRequest();

    expect(rollupSearchRequest).toBeInstanceOf(AbstractSearchRequest);
    expect(rollupSearchRequest.search).toBeDefined();
    expect(rollupSearchRequest.callWithRequest).toBeDefined();
  });

  test('should send one request for single search', async () => {
    const rollupSearchRequest = new RollupSearchRequest();
    const searches = [{ body: 'body', index: 'index' }];

    await rollupSearchRequest.search(searches);

    expect(rollupSearchRequest.callWithRequest).toHaveBeenCalledTimes(1);
    expect(rollupSearchRequest.callWithRequest).toHaveBeenCalledWith('rollup.search', {
      body: 'body',
      index: 'index',
      rest_total_hits_as_int: true,
    });
  });

  test('should send multiple request for multi search', async () => {
    const rollupSearchRequest = new RollupSearchRequest();
    const searches = [
      { body: 'body', index: 'index' },
      { body: 'body1', index: 'index' },
    ];

    await rollupSearchRequest.search(searches);

    expect(rollupSearchRequest.callWithRequest).toHaveBeenCalledTimes(2);
  });
});
