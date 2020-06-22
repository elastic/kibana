/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { signal_ids, signal_status_query, status } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const setSignalsStatusSchema = t.intersection([
  t.type({
    status,
  }),
  t.partial({
    signal_ids,
    query: signal_status_query,
  }),
]);

export type SetSignalsStatusSchema = t.TypeOf<typeof setSignalsStatusSchema>;
export type SetSignalsStatusSchemaDecoded = SetSignalsStatusSchema;
