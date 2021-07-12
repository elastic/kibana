/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeState } from '../../../../../alerting/common';
import { AlertInstance } from '../../../../../alerting/server';

export type SecurityAlertTypeState = AlertTypeState & { previousStartedAt: string };
export interface SecurityRuleState<TState extends AlertTypeState = {}> {
  alertTypeState: TState;
  alertInstances: AlertInstance[];
  previousStartedAt: Date;
}
export interface SecurityAlertTypeReturnValue<TState extends AlertTypeState = {}> {
  bulkCreateTimes: string[];
  createdSignals: unknown[];
  errors: string[];
  lastLookbackDate?: Date | null;
  searchAfterTimes: string[];
  state: TState;
  success: boolean;
  warnings: string[];
}
