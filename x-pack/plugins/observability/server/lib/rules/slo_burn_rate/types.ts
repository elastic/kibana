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
import { FIRED_ACTION } from './executor';

export enum AlertStates {
  OK,
  ALERT,
}

export type BurnRateRuleParams = {
  sloId: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: { value: number; unit: string };
  shortWindow: { value: number; unit: string };
} & Record<string, any>;
export type BurnRateRuleTypeState = RuleTypeState; // no specific rule state
export type BurnRateAlertState = AlertState; // no specific alert state
export type BurnRateAlertContext = AlertContext; // no specific alert context
export type BurnRateAllowedActionGroups = ActionGroupIdsOf<typeof FIRED_ACTION>;
