/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Rule, RuleSummary, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_TAB, EXECUTION_TAB } from './constants';

export type TabId = typeof ALERTS_TAB | typeof EXECUTION_TAB;

export interface RuleDetailsPathParams {
  ruleId: string;
}
export interface PageHeaderProps {
  rule: Rule;
}

export interface FetchRuleProps {
  ruleId?: string;
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
