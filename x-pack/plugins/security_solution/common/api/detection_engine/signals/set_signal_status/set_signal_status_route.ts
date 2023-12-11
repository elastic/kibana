/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { conflicts, signal_ids, signal_status_query, status } from '../../model';

export const setSignalsStatusSchema = t.intersection([
  t.type({
    status,
  }),
  t.partial({
    conflicts,
    signal_ids,
    query: signal_status_query,
  }),
]);

export type SetSignalsStatusSchema = t.TypeOf<typeof setSignalsStatusSchema>;
export type SetSignalsStatusSchemaDecoded = SetSignalsStatusSchema;
