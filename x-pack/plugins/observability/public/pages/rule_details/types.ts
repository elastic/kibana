/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Rule, RuleSummary } from '@kbn/triggers-actions-ui-plugin/public';

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
  isLoadingRule: boolean;
  rule: Rule | null;
  errorRule: boolean;
}

export interface FetchRuleSummaryProps {
  ruleId: string;
  http: HttpSetup;
}

export interface FetchRuleSummary {
  isLoadingRuleSummary: boolean;
  ruleSummary: RuleSummary | null;
  errorRuleSummary: boolean;
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
  translationKey: string;
  defaultMessage: string;
}
export interface ItemValueRuleSummaryProps {
  itemValue: string;
  extraSpace?: boolean;
}
export interface ActionsProps {
  actions: any[];
}

export const EVENT_LOG_LIST_TAB = 'rule_event_log_list';
export const ALERT_LIST_TAB = 'rule_alert_list';
export const EVENT_ERROR_LOG_TAB = 'rule_error_log_list';
