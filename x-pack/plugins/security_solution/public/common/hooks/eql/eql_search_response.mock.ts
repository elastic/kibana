/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { Source } from './types';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import type { Connection } from '@elastic/elasticsearch';

export const getMockEqlResponse = (): EqlSearchStrategyResponse<EqlSearchResponse<Source>> => ({
  id: 'some-id',
  rawResponse: {
    body: {
      hits: {
        events: [
          {
            _index: 'index',
            _id: '1',
            _source: {
              '@timestamp': '2020-10-04T15:16:54.368707900Z',
            },
          },
          {
            _index: 'index',
            _id: '2',
            _source: {
              '@timestamp': '2020-10-04T15:50:54.368707900Z',
            },
          },
          {
            _index: 'index',
            _id: '3',
            _source: {
              '@timestamp': '2020-10-04T15:06:54.368707900Z',
            },
          },
          {
            _index: 'index',
            _id: '4',
            _source: {
              '@timestamp': '2020-10-04T15:15:54.368707900Z',
            },
          },
        ],
        total: {
          value: 4,
          relation: '',
        },
      },
      is_partial: false,
      is_running: false,
      took: 300,
      timed_out: false,
    },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 0,
      context: null,
      name: 'elasticsearch-js',
      connection: {} as Connection,
      request: {
        params: {
          body: JSON.stringify({
            filter: {
              range: {
                '@timestamp': {
                  gte: '2020-10-07T00:46:12.414Z',
                  lte: '2020-10-07T01:46:12.414Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          }),
          method: 'GET',
          path: '/_eql/search/',
          querystring: 'some query string',
        },
        options: {},
        id: '',
      },
    },
    statusCode: 200,
  },
});

export const getMockEndgameEqlResponse = (): EqlSearchStrategyResponse<
  EqlSearchResponse<Source>
> => ({
  id: 'some-id',
  rawResponse: {
    body: {
      hits: {
        events: [
          {
            _index: 'index',
            _id: '1',
            _source: {
              '@timestamp': 1601824614000,
            },
          },
          {
            _index: 'index',
            _id: '2',
            _source: {
              '@timestamp': 1601826654368,
            },
          },
          {
            _index: 'index',
            _id: '3',
            _source: {
              '@timestamp': 1601824014368,
            },
          },
          {
            _index: 'index',
            _id: '4',
            _source: {
              '@timestamp': 1601824554368,
            },
          },
        ],
        total: {
          value: 4,
          relation: '',
        },
      },
      is_partial: false,
      is_running: false,
      took: 300,
      timed_out: false,
    },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 0,
      context: null,
      name: 'elasticsearch-js',
      connection: {} as Connection,
      request: {
        params: {
          body: JSON.stringify({
            filter: {
              range: {
                '@timestamp': {
                  gte: '2020-10-07T00:46:12.414Z',
                  lte: '2020-10-07T01:46:12.414Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          }),
          method: 'GET',
          path: '/_eql/search/',
          querystring: 'some query string',
        },
        options: {},
        id: '',
      },
    },
    statusCode: 200,
  },
});

export const getMockEqlSequenceResponse = (): EqlSearchStrategyResponse<
  EqlSearchResponse<Source>
> => ({
  id: 'some-id',
  rawResponse: {
    body: {
      hits: {
        sequences: [
          {
            join_keys: [],
            events: [
              {
                _index: 'index',
                _id: '1',
                _source: {
                  '@timestamp': '2020-10-04T15:16:54.368707900Z',
                },
              },
              {
                _index: 'index',
                _id: '2',
                _source: {
                  '@timestamp': '2020-10-04T15:50:54.368707900Z',
                },
              },
            ],
          },
          {
            join_keys: [],
            events: [
              {
                _index: 'index',
                _id: '3',
                _source: {
                  '@timestamp': '2020-10-04T15:06:54.368707900Z',
                },
              },
              {
                _index: 'index',
                _id: '4',
                _source: {
                  '@timestamp': '2020-10-04T15:15:54.368707900Z',
                },
              },
            ],
          },
        ],
        total: {
          value: 4,
          relation: '',
        },
      },
      is_partial: false,
      is_running: false,
      took: 300,
      timed_out: false,
    },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 0,
      context: null,
      name: 'elasticsearch-js',
      connection: {} as Connection,
      request: {
        params: {
          body: JSON.stringify({
            filter: {
              range: {
                '@timestamp': {
                  gte: '2020-10-07T00:46:12.414Z',
                  lte: '2020-10-07T01:46:12.414Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          }),
          method: 'GET',
          path: '/_eql/search/',
          querystring: 'some query string',
        },
        options: {},
        id: '',
      },
    },
    statusCode: 200,
  },
});
