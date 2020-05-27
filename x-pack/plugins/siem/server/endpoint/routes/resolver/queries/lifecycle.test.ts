/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LifecycleQuery } from './lifecycle';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';

describe('Lifecycle query', () => {
  it('constructs a legacy multi search query', () => {
    const query = new LifecycleQuery('index-pattern', 'endpointID');
    // using any here because otherwise ts complains that it doesn't know what bool and filter are
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msearch: any = query.buildMSearch('1234');
    expect(msearch[0].index).toBe(legacyEventIndexPattern);
    expect(msearch[1].query.bool.filter[0]).toStrictEqual({
      terms: { 'endgame.unique_pid': ['1234'] },
    });
  });

  it('constructs a non-legacy multi search query', () => {
    const query = new LifecycleQuery('index-pattern');
    // using any here because otherwise ts complains that it doesn't know what bool and filter are
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msearch: any = query.buildMSearch(['1234', '5678']);
    expect(msearch[0].index).toBe('index-pattern');
    expect(msearch[1].query.bool.filter[0]).toStrictEqual({
      terms: { 'process.entity_id': ['1234', '5678'] },
    });
  });
});
