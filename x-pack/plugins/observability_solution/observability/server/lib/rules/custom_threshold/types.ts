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
import { ObservabilityMetricsAlert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
} from '@kbn/rule-data-utils';
import {
  CustomMetricExpressionParams,
  Group,
  SearchConfigurationWithExtractedReferenceType,
} from '../../../../common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID, NO_DATA_ACTIONS_ID, FIRED_ACTION, NO_DATA_ACTION } from './constants';
import { MissingGroupsRecord } from './lib/check_missing_group';

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

// Executor types
export type RuleTypeParams = Record<string, unknown>;

export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
  criteria: CustomMetricExpressionParams[];
  searchConfiguration: SearchConfigurationWithExtractedReferenceType;
  groupBy?: string | string[];
  alertOnNoData: boolean;
  alertOnGroupDisappear?: boolean;
}

export type CustomThresholdRuleTypeState = RuleTypeState & {
  lastRunTimestamp?: number;
  missingGroups?: MissingGroupsRecord[];
  groupBy?: string | string[];
  searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
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

export interface AlertExecutionDetails {
  alertId: string;
  executionId: string;
}

export type CustomThresholdAlert = Omit<
  ObservabilityMetricsAlert,
  'kibana.alert.evaluation.values' | 'kibana.alert.evaluation.threshold' | 'kibana.alert.group'
> & {
  // Defining a custom type for this because the schema generation script doesn't allow explicit null values
  [ALERT_EVALUATION_VALUES]?: Array<number | null>;
  [ALERT_EVALUATION_THRESHOLD]?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
};
