/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RelatedAlertsQuery } from './related_alerts';
import { EndpointAppConstants } from '../../../../common/types';

describe('related alerts query', () => {
  it('generates the correct legacy queries', () => {
    const timestamp = new Date();
    expect(
      new RelatedAlertsQuery('awesome-id', { size: 1, timestamp, eventID: 'foo' }).build('5')
    ).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: { 'endgame.data.alert_details.acting_process.unique_pid': ['5'] },
              },
              {
                term: { 'agent.id': 'awesome-id' },
              },
              {
                term: { 'event.kind': 'alert' },
              },
            ],
          },
        },
        aggs: {
          total: {
            value_count: {
              field: 'endgame.metadata.message_id',
            },
          },
        },
        search_after: [timestamp.getTime(), 'foo'],
        size: 1,
        sort: [{ '@timestamp': 'asc' }, { 'endgame.metadata.message_id': 'asc' }],
      },
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
    });
  });

  it('generates the correct non-legacy queries', () => {
    const timestamp = new Date();

    expect(
      new RelatedAlertsQuery(undefined, { size: 1, timestamp, eventID: 'bar' }).build('baz')
    ).toStrictEqual({
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      terms: { 'endpoint.process.entity_id': ['baz'] },
                    },
                    {
                      terms: { 'process.entity_id': ['baz'] },
                    },
                  ],
                },
              },
              {
                term: { 'event.kind': 'alert' },
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
        search_after: [timestamp.getTime(), 'bar'],
        size: 1,
        sort: [{ '@timestamp': 'asc' }, { 'event.id': 'asc' }],
      },
      index: EndpointAppConstants.EVENT_INDEX_NAME,
    });
  });
});
