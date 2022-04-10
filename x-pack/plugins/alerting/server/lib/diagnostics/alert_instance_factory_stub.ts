/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '../../types';

export const alertInstanceFactoryStub = <
  Params extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string = ''
>(
  id: string
) => ({
  getState() {
    return {} as unknown as InstanceState;
  },
  replaceState(state: InstanceState) {
    return new Alert<InstanceState, InstanceContext, ActionGroupIds>('', {
      state: {} as InstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  scheduleActions(actionGroup: ActionGroupIds, alertcontext: InstanceContext) {
    return new Alert<InstanceState, InstanceContext, ActionGroupIds>('', {
      state: {} as InstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  scheduleActionsWithSubGroup(
    actionGroup: ActionGroupIds,
    subgroup: string,
    alertcontext: InstanceContext
  ) {
    return new Alert<InstanceState, InstanceContext, ActionGroupIds>('', {
      state: {} as InstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  setContext(alertContext: InstanceContext) {
    return new Alert<InstanceState, InstanceContext, ActionGroupIds>('', {
      state: {} as InstanceState,
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
  },
  getContext() {
    return {} as unknown as InstanceContext;
  },
  hasContext() {
    return false;
  },
});
