/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LifecycleQuery } from './lifecycle';
import { fakeEventIndexPattern } from './children.test';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';

describe('lifecycle query', () => {
  it('generates the correct legacy queries', () => {
    expect(new LifecycleQuery(legacyEventIndexPattern, 'awesome-id').build('5')).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: { 'endgame.unique_pid': ['5'] },
              },
              {
                term: { 'agent.id': 'awesome-id' },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        size: 10000,
        sort: [{ '@timestamp': 'asc' }],
      },
      index: legacyEventIndexPattern,
    });
  });

  it('generates the correct non-legacy queries', () => {
    expect(new LifecycleQuery(fakeEventIndexPattern).build('baz')).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: { 'process.entity_id': ['baz'] },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        size: 10000,
        sort: [{ '@timestamp': 'asc' }],
      },
      index: fakeEventIndexPattern,
    });
  });
});
