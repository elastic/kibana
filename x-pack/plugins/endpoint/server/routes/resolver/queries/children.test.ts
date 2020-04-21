/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ChildrenQuery } from './children';
import { EndpointAppConstants } from '../../../../common/types';

export const fakeEventIndexPattern = 'events-endpoint-*';

describe('children events query', () => {
  it('generates the correct legacy queries', () => {
    const timestamp = new Date().getTime();
    expect(
      new ChildrenQuery(EndpointAppConstants.LEGACY_EVENT_INDEX_NAME, 'awesome-id', {
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
                term: { 'event.type': 'process_start' },
              },
            ],
          },
        },
        aggs: {
          total: {
            value_count: {
              field: 'endgame.serial_event_id',
            },
          },
        },
        search_after: [timestamp, 'foo'],
        size: 1,
        sort: [{ '@timestamp': 'asc' }, { 'endgame.serial_event_id': 'asc' }],
      },
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
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
                bool: {
                  should: [
                    {
                      terms: { 'endpoint.process.parent.entity_id': ['baz'] },
                    },
                    {
                      terms: { 'process.parent.entity_id': ['baz'] },
                    },
                  ],
                },
              },
              {
                term: { 'event.category': 'process' },
              },
              {
                term: { 'event.type': 'start' },
              },
            ],
          },
        },
        aggs: {
          total: {
            value_count: {
              field: 'event.id',
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
