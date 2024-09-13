/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import { defaultQuery, getSearchConfiguration } from './get_search_configuration';

describe('getSearchConfiguration()', () => {
  const onWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the same query if query has the correct type', () => {
    const query = {
      query: 'random query',
      language: 'random language',
    };

    expect(getSearchConfiguration({ query }, onWarning)).toEqual({ query });
    expect(onWarning).toHaveBeenCalledTimes(0);
  });

  it('should return undefined for query if query is undefined', () => {
    expect(getSearchConfiguration({}, onWarning)).toEqual({});
    expect(onWarning).toHaveBeenCalledTimes(0);
  });

  it('should return default query if type of query is not Query and calls onWarning', () => {
    const query = {
      esql: 'random esql',
    };

    expect(getSearchConfiguration({ query }, onWarning)).toEqual({ query: defaultQuery });
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it('should return filter without $state field WITHOUT query', () => {
    const filter = [
      {
        meta: {
          alias: null,
          disabled: false,
          field: 'service.name',
          index: 'dataset-logs-*-*',
          key: 'service.name',
          negate: false,
          params: {
            query: 'synth-node-0',
          },
          type: 'phrase',
        },
        query: {
          match_phrase: {
            'service.name': 'synth-node-0',
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ];

    expect(getSearchConfiguration({ filter }, onWarning)).toEqual({
      filter: filter.map((aFilter) => ({ meta: aFilter.meta, query: aFilter.query })),
    });
    expect(onWarning).toHaveBeenCalledTimes(0);
  });

  it('should return filter without $state field WITH esql query', () => {
    const filter = [
      {
        meta: {
          alias: null,
          disabled: false,
          field: 'service.name',
          index: 'dataset-logs-*-*',
          key: 'service.name',
          negate: false,
          params: {
            query: 'synth-node-0',
          },
          type: 'phrase',
        },
        query: {
          match_phrase: {
            'service.name': 'synth-node-0',
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ];
    const query = {
      esql: 'random esql',
    };

    expect(getSearchConfiguration({ filter, query }, onWarning)).toEqual({
      filter: filter.map((aFilter) => ({ meta: aFilter.meta, query: aFilter.query })),
      query: defaultQuery,
    });
    expect(onWarning).toHaveBeenCalledTimes(1);
  });
});
