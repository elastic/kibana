/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

export const querySignalsSchema = t.exact(
  t.partial({
    query: t.object,
    aggs: t.object,
    size: PositiveInteger,
    track_total_hits: t.boolean,
    _source: t.array(t.string),
    runtime_mappings: t.unknown,
  })
);

export type QuerySignalsSchema = t.TypeOf<typeof querySignalsSchema>;
export type QuerySignalsSchemaDecoded = QuerySignalsSchema;
