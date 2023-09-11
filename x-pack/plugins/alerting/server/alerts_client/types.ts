/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import { DeepPartial } from '@kbn/utility-types';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { Alert as LegacyAlert } from '../alert/alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsFilter,
  SummarizedAlerts,
  RawAlertInstance,
  RuleAlertData,
  RuleNotifyWhenType,
  WithoutReservedActionGroups,
} from '../types';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import type { PublicAlertFactory } from '../alert/create_alert_factory';

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
  AlertData extends RuleAlertData,
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
  persistAlerts(): Promise<void>;
  getSummarizedAlerts?(params: GetSummarizedAlertsParams): Promise<SummarizedAlerts>;
  getAlertsToSerialize(): {
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  };
  factory(): PublicAlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  client(): PublicAlertsClient<
    AlertData,
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  > | null;
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

export interface PublicAlertsClient<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  report(alert: ReportedAlert<AlertData, State, Context, ActionGroupIds>): ReportedAlertData;
  setAlertData(alert: UpdateableAlert<AlertData, State, Context, ActionGroupIds>): void;
  getAlertLimitValue: () => number;
  setAlertLimitReached: (reached: boolean) => void;
  getRecoveredAlerts: () => Array<RecoveredAlertData<AlertData, State, Context, ActionGroupIds>>;
}

export interface ReportedAlert<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  id: string; // alert instance id
  actionGroup: ActionGroupIds;
  state?: State;
  context?: Context;
  payload?: DeepPartial<AlertData>;
}

export interface RecoveredAlertData<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  alert: LegacyAlert<State, Context, ActionGroupIds>;
  hit?: AlertData;
}

export interface ReportedAlertData {
  uuid: string;
  start: string | null;
}

export type UpdateableAlert<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> = Pick<ReportedAlert<AlertData, State, Context, ActionGroupIds>, 'id' | 'context' | 'payload'>;

export type SearchResult<AlertData> = Pick<
  SearchResponseBody<Alert & AlertData>['hits'],
  'hits' | 'total'
>;

export type GetSummarizedAlertsParams = {
  ruleId: string;
  spaceId: string;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
} & (
  | { start: Date; end: Date; executionUuid?: never }
  | { executionUuid: string; start?: never; end?: never }
);

export type GetAlertsQueryParams = Omit<
  GetSummarizedAlertsParams,
  'formatAlert' | 'isLifecycleAlert' | 'spaceId'
>;

export interface GetLifecycleAlertsQueryByExecutionUuidParams {
  executionUuid: string;
  ruleId: string;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
}

export interface GetQueryByExecutionUuidParams
  extends GetLifecycleAlertsQueryByExecutionUuidParams {
  action?: string;
}

export interface GetLifecycleAlertsQueryByTimeRangeParams {
  start: Date;
  end: Date;
  ruleId: string;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
}

export interface GetQueryByTimeRangeParams<AlertTypes>
  extends GetLifecycleAlertsQueryByTimeRangeParams {
  type?: AlertTypes;
}
