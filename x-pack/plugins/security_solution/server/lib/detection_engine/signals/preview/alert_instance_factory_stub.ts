/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { Alert } from '@kbn/alerting-plugin/server/alert';
import type { RuleParams } from '../../rule_schema';

export const alertInstanceFactoryStub = <
  TParams extends RuleParams,
  TState extends RuleTypeState,
  TInstanceState extends AlertInstanceState,
  TInstanceContext extends AlertInstanceContext,
  TActionGroupIds extends string = ''
>(
  id: string
) => ({
  getState() {
    return {} as unknown as TInstanceState;
  },
  replaceState(state: TInstanceState) {
    return new Alert<TInstanceState, TInstanceContext, TActionGroupIds>('', {
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  scheduleActions(actionGroup: TActionGroupIds, alertcontext: TInstanceContext) {
    return new Alert<TInstanceState, TInstanceContext, TActionGroupIds>('', {
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  setContext(alertContext: TInstanceContext) {
    return new Alert<TInstanceState, TInstanceContext, TActionGroupIds>('', {
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  getContext() {
    return {} as unknown as TInstanceContext;
  },
  hasContext() {
    return false;
  },
});
