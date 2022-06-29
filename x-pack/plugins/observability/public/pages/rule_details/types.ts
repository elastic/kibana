/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  Rule,
  RuleSummary,
  RuleType,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';

export interface RuleDetailsPathParams {
  ruleId: string;
}
export interface PageHeaderProps {
  rule: Rule;
}

export interface FetchRuleProps {
  ruleId: string;
  http: HttpSetup;
}

export interface FetchRule {
  isRuleLoading: boolean;
  rule?: Rule;
  ruleType?: RuleType;
  errorRule?: string;
}

export interface FetchRuleSummaryProps {
  ruleId: string;
  http: HttpSetup;
}
export interface FetchRuleActionConnectorsProps {
  http: HttpSetup;
  ruleActions: any[];
}

export interface FetchRuleExecutionLogProps {
  http: HttpSetup;
  ruleId: string;
}

export interface FetchRuleSummary {
  isLoadingRuleSummary: boolean;
  ruleSummary?: RuleSummary;
  errorRuleSummary?: string;
}

export interface AlertListItemStatus {
  label: string;
  healthColor: string;
  actionGroup?: string;
}
export interface AlertListItem {
  alert: string;
  status: AlertListItemStatus;
  start?: Date;
  duration: number;
  isMuted: boolean;
  sortPriority: number;
}
export interface ItemTitleRuleSummaryProps {
  children: string;
}
export interface ItemValueRuleSummaryProps {
  itemValue: string;
  extraSpace?: boolean;
}
export interface ActionsProps {
  ruleActions: any[];
  actionTypeRegistry: ActionTypeRegistryContract;
}

export const EVENT_LOG_LIST_TAB = 'rule_event_log_list';
export const ALERT_LIST_TAB = 'rule_alert_list';
export const EVENT_ERROR_LOG_TAB = 'rule_error_log_list';
