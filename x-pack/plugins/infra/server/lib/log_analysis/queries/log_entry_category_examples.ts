/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters } from './common';

export const createLogEntryCategoryExamplesQuery = (
  indices: string,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  categoryQuery: string,
  exampleCount: number
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          {
            range: {
              [timestampField]: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            match: {
              message: {
                query: categoryQuery,
                operator: 'AND',
              },
            },
          },
        ],
      },
    },
    sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
  },
  _source: ['event.dataset', 'message', 'container.id', 'host.name', 'log.file.path'],
  index: indices,
  size: exampleCount,
});

export const logEntryCategoryExampleHitRT = rt.type({
  _id: rt.string,
  _source: rt.partial({
    event: rt.partial({
      dataset: rt.string,
    }),
    message: rt.string,
    container: rt.partial({
      id: rt.string,
    }),
    host: rt.partial({
      name: rt.string,
    }),
    log: rt.partial({
      file: rt.partial({
        path: rt.string,
      }),
    }),
  }),
  sort: rt.tuple([rt.number, rt.number]),
});

export type LogEntryCategoryExampleHit = rt.TypeOf<typeof logEntryCategoryExampleHitRT>;

export const logEntryCategoryExamplesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryCategoryExampleHitRT),
    }),
  }),
]);

export type logEntryCategoryExamplesResponse = rt.TypeOf<typeof logEntryCategoryExamplesResponseRT>;
