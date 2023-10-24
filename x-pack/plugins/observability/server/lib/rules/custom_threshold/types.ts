/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RecoveredActionGroup,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { Alert } from '@kbn/alerting-plugin/server';
import { TypeOf } from '@kbn/config-schema';
import { FIRED_ACTIONS_ID, NO_DATA_ACTIONS_ID } from './constants';
import { FIRED_ACTIONS, NO_DATA_ACTIONS } from './custom_threshold_executor';
import { MissingGroupsRecord } from './lib/check_missing_group';
import { AdditionalContext } from './utils';
import { searchConfigurationSchema } from './register_custom_threshold_rule_type';
import { Aggregators, Comparator } from '../../../../common/custom_threshold_rule/types';
import { TimeUnitChar } from '../../../../common';

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

// Executor types
export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;

export type CustomThresholdRuleParams = Record<string, any>;
export type CustomThresholdRuleTypeState = RuleTypeState & {
  lastRunTimestamp?: number;
  missingGroups?: Array<string | MissingGroupsRecord>;
  groupBy?: string | string[];
  searchConfiguration?: SearchConfigurationType;
};
export type CustomThresholdAlertState = AlertState; // no specific instance state used
export type CustomThresholdAlertContext = AlertContext & {
  alertDetailsUrl: string;
  group?: object;
  reason?: string;
  timestamp: string; // ISO string
  value?: Array<number | null> | null;
};
export type CustomThresholdSpecificActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof NO_DATA_ACTIONS
>;
export type CustomThresholdActionGroup =
  | typeof FIRED_ACTIONS_ID
  | typeof NO_DATA_ACTIONS_ID
  | typeof RecoveredActionGroup.id;

export type Group = Array<{
  field: string;
  value: string;
}>;

export type CustomThresholdAlertFactory = (
  id: string,
  reason: string,
  actionGroup: CustomThresholdActionGroup,
  additionalContext?: AdditionalContext | null,
  evaluationValues?: Array<number | null>,
  group?: Group
) => CustomThresholdAlert;

type CustomThresholdAlert = Alert<
  CustomThresholdAlertState,
  CustomThresholdAlertContext,
  CustomThresholdSpecificActionGroups
>;

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  threshold: number[];
  comparator: Comparator;
}

export interface NonCountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Exclude<Aggregators, [Aggregators.COUNT, Aggregators.CUSTOM]>;
  metric: string;
}

export interface CountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Aggregators.COUNT;
}

export type CustomMetricAggTypes = Exclude<
  Aggregators,
  Aggregators.CUSTOM | Aggregators.RATE | Aggregators.P95 | Aggregators.P99
>;

export interface AlertExecutionDetails {
  alertId: string;
  executionId: string;
}
