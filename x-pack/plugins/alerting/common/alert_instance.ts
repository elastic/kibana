/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { DateFromString } from './date_from_string';

const metaSchema = t.partial({
  lastScheduledActions: t.type({
    group: t.string,
    date: DateFromString,
  }),
});
export type AlertInstanceMeta = t.TypeOf<typeof metaSchema>;

const stateSchema = t.record(t.string, t.unknown);
export type AlertInstanceState = t.TypeOf<typeof stateSchema>;

export const rawAlertInstance = t.partial({
  state: stateSchema,
  meta: metaSchema,
});
export type RawAlertInstance = t.TypeOf<typeof rawAlertInstance>;
