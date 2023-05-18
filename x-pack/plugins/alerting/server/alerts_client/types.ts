/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import { Alert as LegacyAlert } from '../alert/alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RawAlertInstance,
  RuleNotifyWhenType,
} from '../types';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';

export interface AlertRuleData {
  consumer: string;
  executionId: string;
  id: string;
  name: string;
  parameters: unknown;
  revision: number;
  spaceId: string;
  tags: string[];
}

export interface AlertRule {
  kibana?: {
    alert: {
      rule: Alert['kibana']['alert']['rule'];
    };
    space_ids: Alert['kibana']['space_ids'];
  };
}

export interface IAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  initializeExecution(opts: InitializeExecutionOpts): Promise<void>;
  hasReachedAlertLimit(): boolean;
  checkLimitUsage(): void;
  processAndLogAlerts(opts: ProcessAndLogAlertsOpts): void;
  getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ): Record<string, LegacyAlert<State, Context, ActionGroupIds | RecoveryActionGroupId>>;
  getAlertsToSerialize(): Promise<{
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  }>;
}

export interface ProcessAndLogAlertsOpts {
  eventLogger: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
  flappingSettings: RulesSettingsFlappingProperties;
  notifyWhen: RuleNotifyWhenType | null;
  maintenanceWindowIds: string[];
}

export interface InitializeExecutionOpts {
  maxAlerts: number;
  ruleLabel: string;
  flappingSettings: RulesSettingsFlappingProperties;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
}

export interface TrackedAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  active: Record<string, LegacyAlert<State, Context>>;
  recovered: Record<string, LegacyAlert<State, Context>>;
}
