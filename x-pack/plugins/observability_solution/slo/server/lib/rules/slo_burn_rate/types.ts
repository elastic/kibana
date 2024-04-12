/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
} from '../../../../common/constants';

export enum AlertStates {
  OK,
  ALERT,
}

export interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number | null;
  longWindow: { value: number; unit: string };
  shortWindow: { value: number; unit: string };
  actionGroup: string;
}

export type BurnRateRuleParams = {
  sloId: string;
  windows: WindowSchema[];
} & Record<string, any>;
export type BurnRateRuleTypeState = RuleTypeState; // no specific rule state
export type BurnRateAlertState = AlertState; // no specific alert state
export type BurnRateAlertContext = AlertContext; // no specific alert context
export type BurnRateAllowedActionGroups = ActionGroupIdsOf<
  | typeof ALERT_ACTION
  | typeof HIGH_PRIORITY_ACTION
  | typeof MEDIUM_PRIORITY_ACTION
  | typeof LOW_PRIORITY_ACTION
>;
