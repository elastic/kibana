/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AlertInstanceMeta,
  AlertInstanceState,
  RawAlertInstance,
  rawAlertInstance,
} from '../../common';

import { State, Context } from '../types';
import { parseDuration } from '../lib';

interface ScheduledExecutionOptions {
  actionGroup: string;
  context: Context;
  state: State;
}
export type AlertInstances = Record<string, AlertInstance>;
export class AlertInstance {
  private scheduledExecutionOptions?: ScheduledExecutionOptions;
  private meta: AlertInstanceMeta;
  private state: AlertInstanceState;

  constructor({ state = {}, meta = {} }: RawAlertInstance = {}) {
    this.state = state;
    this.meta = meta;
  }

  hasScheduledActions() {
    return this.scheduledExecutionOptions !== undefined;
  }

  isThrottled(throttle: string | null) {
    if (this.scheduledExecutionOptions === undefined) {
      return false;
    }
    const throttleMills = throttle ? parseDuration(throttle) : 0;
    const actionGroup = this.scheduledExecutionOptions.actionGroup;
    if (
      this.meta.lastScheduledActions &&
      this.meta.lastScheduledActions.group === actionGroup &&
      this.meta.lastScheduledActions.date.getTime() + throttleMills > Date.now()
    ) {
      return true;
    }
    return false;
  }

  getScheduledActionOptions() {
    return this.scheduledExecutionOptions;
  }

  unscheduleActions() {
    this.scheduledExecutionOptions = undefined;
    return this;
  }

  getState() {
    return this.state;
  }

  scheduleActions(actionGroup: string, context: Context = {}) {
    if (this.hasScheduledActions()) {
      throw new Error('Alert instance execution has already been scheduled, cannot schedule twice');
    }
    this.scheduledExecutionOptions = { actionGroup, context, state: this.state };
    return this;
  }

  replaceState(state: State) {
    this.state = state;
    return this;
  }

  updateLastScheduledActions(group: string) {
    this.meta.lastScheduledActions = { group, date: new Date() };
  }

  /**
   * Used to serialize alert instance state
   */
  toJSON() {
    return rawAlertInstance.encode(this.toRaw());
  }

  toRaw(): RawAlertInstance {
    return {
      state: this.state,
      meta: this.meta,
    };
  }
}
