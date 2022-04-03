/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const UptimeCommonStateType = t.intersection([
  t.partial({
    currentTriggerStarted: t.string,
    firstTriggeredAt: t.string,
    lastTriggeredAt: t.string,
    lastResolvedAt: t.string,
  }),
  t.type({
    firstCheckedAt: t.string,
    lastCheckedAt: t.string,
    isTriggered: t.boolean,
  }),
]);

export type UptimeCommonState = t.TypeOf<typeof UptimeCommonStateType>;
