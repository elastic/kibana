/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DateFromString } from './date_from_string';

const metaSchema = t.partial({
  lastScheduledActions: t.intersection([
    t.partial({
      subgroup: t.string,
    }),
    t.type({
      group: t.string,
      date: DateFromString,
    }),
  ]),
});
export type AlertInstanceMeta = t.TypeOf<typeof metaSchema>;

const stateSchema = t.record(t.string, t.unknown);
export type AlertInstanceState = t.TypeOf<typeof stateSchema>;

const contextSchema = t.record(t.string, t.unknown);
export type AlertInstanceContext = t.TypeOf<typeof contextSchema>;

export const rawAlertStaticContext = t.partial({
  duration: t.number,
  start: t.string,
  end: t.string,
  threshold: t.number,
  value: t.number,
  reason: t.string,
});
export type RawAlertStaticContext = t.TypeOf<typeof rawAlertStaticContext>;

export const rawAlertInstance = t.partial({
  state: stateSchema,
  meta: metaSchema,
  staticContext: rawAlertStaticContext,
});
export type RawAlertInstance = t.TypeOf<typeof rawAlertInstance>;
