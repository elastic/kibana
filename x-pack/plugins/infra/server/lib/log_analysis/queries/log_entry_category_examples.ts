/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters } from './common';

export const createLogEntryCategoryExamplesQuery = (
  indices: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  categoryQuery: string,
  exampleCount: number
): estypes.SearchRequest => ({
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
                format: 'epoch_millis',
              },
            },
          },
          {
            match: {
              message: {
                query: categoryQuery,
                operator: 'and',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
    _source: false,
    fields: ['event.dataset', 'message', 'container.id', 'host.name', 'log.file.path'],
  },
  index: indices,
  size: exampleCount,
});

export const logEntryCategoryExampleHitRT = rt.type({
  _id: rt.string,
  fields: rt.partial({
    'event.dataset': rt.array(rt.string),
    message: rt.array(rt.string),
    'container.id': rt.array(rt.string),
    'host.name': rt.array(rt.string),
    'log.file.path': rt.array(rt.string),
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export type logEntryCategoryExamplesResponse = rt.TypeOf<typeof logEntryCategoryExamplesResponseRT>;
