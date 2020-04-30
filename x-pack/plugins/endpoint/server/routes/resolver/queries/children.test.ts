/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ChildrenQuery } from './children';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';

export const fakeEventIndexPattern = 'events-endpoint-*';

describe('children events query', () => {
  it('generates the correct legacy queries', () => {
    const timestamp = new Date().getTime();
    expect(
      new ChildrenQuery(legacyEventIndexPattern, 'awesome-id', {
        size: 1,
        timestamp,
        eventID: 'foo',
      }).build('5')
    ).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: { 'endgame.unique_ppid': ['5'] },
              },
              {
                term: { 'agent.id': 'awesome-id' },
              },
              {
                term: { 'event.category': 'process' },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                bool: {
                  should: [
                    {
                      term: { 'event.type': 'process_start' },
                    },
                    {
                      term: { 'event.action': 'fork_event' },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          totals: {
            terms: {
              field: 'endgame.unique_ppid',
              size: 1,
            },
          },
        },
        search_after: [timestamp, 'foo'],
        size: 1,
        sort: [{ '@timestamp': 'asc' }, { 'endgame.serial_event_id': 'asc' }],
      },
      index: legacyEventIndexPattern,
    });
  });

  it('generates the correct non-legacy queries', () => {
    const timestamp = new Date().getTime();

    expect(
      new ChildrenQuery(fakeEventIndexPattern, undefined, {
        size: 1,
        timestamp,
        eventID: 'bar',
      }).build('baz')
    ).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: { 'process.parent.entity_id': ['baz'] },
              },
              {
                term: { 'event.category': 'process' },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                term: { 'event.type': 'start' },
              },
            ],
          },
        },
        aggs: {
          totals: {
            terms: {
              field: 'process.parent.entity_id',
              size: 1,
            },
          },
        },
        search_after: [timestamp, 'bar'],
        size: 1,
        sort: [{ '@timestamp': 'asc' }, { 'event.id': 'asc' }],
      },
      index: fakeEventIndexPattern,
    });
  });
});
