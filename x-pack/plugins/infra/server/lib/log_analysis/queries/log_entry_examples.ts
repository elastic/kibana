/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as rt from 'io-ts';
import { partitionField } from '../../../../common/log_analysis';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters } from './common';

export const createLogEntryExamplesQuery = (
  indices: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  categoryQuery?: string
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
          ...(dataset !== ''
            ? [
                {
                  term: {
                    [partitionField]: dataset,
                  },
                },
              ]
            : [
                {
                  bool: {
                    must_not: [
                      {
                        exists: {
                          field: partitionField,
                        },
                      },
                    ],
                  },
                },
              ]),
          ...(categoryQuery
            ? [
                {
                  match: {
                    message: {
                      query: categoryQuery,
                      operator: 'and' as const,
                    },
                  },
                },
              ]
            : []),
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
    _source: false,
    fields: ['event.dataset', 'message'],
  },
  index: indices,
  size: exampleCount,
});

export const logEntryExampleHitRT = rt.type({
  _id: rt.string,
  fields: rt.partial({
    'event.dataset': rt.array(rt.string),
    message: rt.array(rt.string),
  }),
  sort: rt.tuple([rt.number, rt.number]),
});

export type LogEntryExampleHit = rt.TypeOf<typeof logEntryExampleHitRT>;

export const logEntryExamplesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryExampleHitRT),
    }),
  }),
]);

export type LogEntryExamplesResponse = rt.TypeOf<typeof logEntryExamplesResponseRT>;
