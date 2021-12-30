/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { rawAlertInstance } from './alert_instance';
import { DateFromString } from './date_from_string';

export const ruleStateSchema = t.partial({
  alertTypeState: t.record(t.string, t.unknown),
  alertInstances: t.record(t.string, rawAlertInstance),
  previousStartedAt: t.union([t.null, DateFromString]),
});

export type RuleTaskState = t.TypeOf<typeof ruleStateSchema>;

export const ruleParamsSchema = t.intersection([
  t.type({
    alertId: t.string,
  }),
  t.partial({
    spaceId: t.string,
  }),
]);
export type RuleTaskParams = t.TypeOf<typeof ruleParamsSchema>;
