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
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { CustomMetricExpressionParams } from '../../../../common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID, NO_DATA_ACTIONS_ID, FIRED_ACTION, NO_DATA_ACTION } from './constants';
import { MissingGroupsRecord } from './lib/check_missing_group';
import { AdditionalContext } from './utils';
import { searchConfigurationSchema } from './register_custom_threshold_rule_type';

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

// Executor types
export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;
export type RuleTypeParams = Record<string, unknown>;

export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
  criteria: CustomMetricExpressionParams[];
  // Index will be a data view spec after extracting references
  searchConfiguration: Omit<SearchConfigurationType, 'index'> & { index: DataViewSpec };
  groupBy?: string | string[];
  alertOnNoData: boolean;
  alertOnGroupDisappear?: boolean;
}

export type CustomThresholdRuleTypeState = RuleTypeState & {
  lastRunTimestamp?: number;
  missingGroups?: Array<string | MissingGroupsRecord>;
  groupBy?: string | string[];
  searchConfiguration?: Omit<SearchConfigurationType, 'index'> & { index: DataViewSpec };
};
export type CustomThresholdAlertState = AlertState; // no specific instance state used
export type CustomThresholdAlertContext = AlertContext & {
  alertDetailsUrl: string;
  group?: object;
  reason?: string;
  timestamp: string; // ISO string
  // String type is for [NO DATA]
  value?: Array<number | string | null>;
};
export type CustomThresholdSpecificActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTION | typeof NO_DATA_ACTION
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
  threshold?: Array<number | null>,
  group?: Group
) => CustomThresholdAlert;

type CustomThresholdAlert = Alert<
  CustomThresholdAlertState,
  CustomThresholdAlertContext,
  CustomThresholdSpecificActionGroups
>;

export interface AlertExecutionDetails {
  alertId: string;
  executionId: string;
}
