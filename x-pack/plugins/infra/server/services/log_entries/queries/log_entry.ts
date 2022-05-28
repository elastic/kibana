/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as rt from 'io-ts';
import { jsonArrayRT } from '../../../../common/typed_json';
import {
  commonHitFieldsRT,
  commonSearchSuccessResponseFieldsRT,
} from '../../../utils/elasticsearch_runtime_types';

export const createGetLogEntryQuery = (
  logEntryIndex: string,
  logEntryId: string,
  timestampField: string,
  tiebreakerField: string,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.AsyncSearchSubmitRequest => ({
  index: logEntryIndex,
  terminate_after: 1,
  track_scores: false,
  track_total_hits: false,
  body: {
    size: 1,
    query: {
      ids: {
        values: [logEntryId],
      },
    },
    fields: ['*'],
    runtime_mappings: runtimeMappings,
    sort: [{ [timestampField]: 'desc' }, { [tiebreakerField]: 'desc' }],
    _source: false,
  },
});

export const logEntryHitRT = rt.intersection([
  commonHitFieldsRT,
  rt.type({
    sort: rt.tuple([rt.number, rt.number]),
  }),
  rt.partial({
    fields: rt.record(rt.string, jsonArrayRT),
  }),
]);

export type LogEntryHit = rt.TypeOf<typeof logEntryHitRT>;

export const getLogEntryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryHitRT),
    }),
  }),
]);

export type GetLogEntryResponse = rt.TypeOf<typeof getLogEntryResponseRT>;
