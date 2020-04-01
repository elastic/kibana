/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointAppConstants } from '../../../../common/types';
import { LifecycleQuery } from './lifecycle';

describe('lifecycle query', () => {
  it('generates the correct legacy queries', () => {
    expect(new LifecycleQuery('awesome-id').build('5')).toStrictEqual({
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
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
      },
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
    });
  });

  it('generates the correct non-legacy queries', () => {
    expect(new LifecycleQuery().build('baz')).toStrictEqual({
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
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
      },
      index: EndpointAppConstants.EVENT_INDEX_NAME,
    });
  });
});
