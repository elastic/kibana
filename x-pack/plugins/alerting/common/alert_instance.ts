/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DateFromString } from './date_from_string';

const actionSchema = t.type({
  date: DateFromString,
});

export const throttledActionSchema = t.record(t.string, actionSchema);
export type ThrottledActions = t.TypeOf<typeof throttledActionSchema>;

const lastScheduledActionsSchema = t.intersection([
  t.partial({
    subgroup: t.string,
  }),
  t.type({
    group: t.string,
    date: DateFromString,
  }),
  t.partial({ actions: throttledActionSchema }),
]);

export type LastScheduledActions = t.TypeOf<typeof lastScheduledActionsSchema>;

const metaSchema = t.partial({
  lastScheduledActions: lastScheduledActionsSchema,
  // an array used to track changes in alert state, the order is based on the rule executions (oldest to most recent)
  // true - alert has changed from active/recovered
  // false - the status has remained either active or recovered
  flappingHistory: t.array(t.boolean),
  // flapping flag that indicates whether the alert is flapping
  flapping: t.boolean,
  pendingRecoveredCount: t.number,
  // when alert started
  start: DateFromString,
  // when alert recovered
  end: DateFromString,
  // string version of millisecond duration of alert
  duration: t.string,
});
export type AlertInstanceMeta = t.TypeOf<typeof metaSchema>;

const stateSchema = t.record(t.string, t.unknown);
export type AlertInstanceState = t.TypeOf<typeof stateSchema>;

const contextSchema = t.record(t.string, t.unknown);
export type AlertInstanceContext = t.TypeOf<typeof contextSchema>;

export const rawAlertInstance = t.partial({
  state: stateSchema,
  meta: metaSchema,
});
export type RawAlertInstance = t.TypeOf<typeof rawAlertInstance>;
