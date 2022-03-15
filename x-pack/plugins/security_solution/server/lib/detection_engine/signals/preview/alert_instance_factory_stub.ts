/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleParams } from '../../schemas/rule_schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../../../alerting/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Alert } from '../../../../../../alerting/server/alert';

export const alertInstanceFactoryStub = <
  TParams extends RuleParams,
  TState extends AlertTypeState,
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
  scheduleActionsWithSubGroup(
    actionGroup: TActionGroupIds,
    subgroup: string,
    alertcontext: TInstanceContext
  ) {
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
