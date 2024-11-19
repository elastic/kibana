/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { filtersRt } from './default_api_types';

describe('filtersRt', () => {
  it('should decode', () => {
    const filters =
      '{"must_not":[{"term":{"service.name":"myService"}}],"filter":[{"range":{"@timestamp":{"gte":1617273600000,"lte":1617277200000}}}]}';
    const result = filtersRt.decode(filters);
    expect(result).toEqual({
      _tag: 'Right',
      right: {
        should: [],
        must: [],
        must_not: [{ term: { 'service.name': 'myService' } }],
        filter: [{ range: { '@timestamp': { gte: 1617273600000, lte: 1617277200000 } } }],
      },
    });
  });

  it.each(['3', 'true', '{}'])('should not decode invalid filter JSON: %s', (invalidJson) => {
    const filters = `{ "filter": ${invalidJson}}`;
    const result = filtersRt.decode(filters);
    // @ts-ignore-next-line
    expect(result.left[0].message).toEqual('filters.filter is not iterable');
    expect(isLeft(result)).toEqual(true);
  });

  it.each(['3', 'true', '{}'])('should not decode invalid must_not JSON: %s', (invalidJson) => {
    const filters = `{ "must_not": ${invalidJson}}`;
    const result = filtersRt.decode(filters);
    // @ts-ignore-next-line
    expect(result.left[0].message).toEqual('filters.must_not is not iterable');
    expect(isLeft(result)).toEqual(true);
  });
});
