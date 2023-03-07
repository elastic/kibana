/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { RuleTypeState } from './types';

const trackedAlertStateRt = rt.type({
  alertId: rt.string,
  alertUuid: rt.string,
  started: rt.string,
  // an array used to track changes in alert state, the order is based on the rule executions
  // true - alert has changed from active/recovered
  // false - alert is new or the status has remained either active or recovered
  flappingHistory: rt.array(rt.boolean),
  // flapping flag that indicates whether the alert is flapping
  flapping: rt.boolean,
  pendingRecoveredCount: rt.number,
});

export type TrackedLifecycleAlertState = rt.TypeOf<typeof trackedAlertStateRt>;

const alertTypeStateRt = <State extends RuleTypeState>() =>
  rt.record(rt.string, rt.unknown) as rt.Type<State, State, unknown>;

// The types below are used to store rule state for lifecycle rules.  The
// specific rule type state is actually stored in `wrapped`, and then passed
// to the rule executor by the lifecycle executor.

export const WrappedLifecycleRuleStateSchema = <State extends RuleTypeState>() =>
  rt.type({
    wrapped: alertTypeStateRt<State>(),
    // tracks the active alerts
    trackedAlerts: rt.record(rt.string, trackedAlertStateRt),
    // tracks the recovered alerts
    trackedAlertsRecovered: rt.record(rt.string, trackedAlertStateRt),
  });

/**
 * This is redefined instead of derived from above `wrappedStateRt` because
 * there's no easy way to instantiate generic values such as the runtime type
 * factory function.
 */
export type WrappedLifecycleRuleState<State extends RuleTypeState> = RuleTypeState & {
  wrapped: State;
  trackedAlerts: Record<string, TrackedLifecycleAlertState>;
  trackedAlertsRecovered: Record<string, TrackedLifecycleAlertState>;
};
