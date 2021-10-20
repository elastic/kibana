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
import { AlertInstance } from '../../../../../../alerting/server/alert_instance';

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
    return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  scheduleActions(actionGroup: TActionGroupIds, alertcontext: TInstanceContext) {
    return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  scheduleActionsWithSubGroup(
    actionGroup: TActionGroupIds,
    subgroup: string,
    alertcontext: TInstanceContext
  ) {
    return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
      state: {} as TInstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
});
