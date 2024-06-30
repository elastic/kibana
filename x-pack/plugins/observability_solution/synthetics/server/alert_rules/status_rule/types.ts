/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { ActionGroupIdsOf } from '@kbn/alerting-types';
import { StatusRuleParams } from '../../../common/rules/status_rule';
import { MONITOR_STATUS } from '../../../common/constants/synthetics_alerts';
import {
  SyntheticsCommonState,
  SyntheticsMonitorStatusAlertState,
} from '../../../common/runtime_types/alert_rules/common';

type MonitorStatusRuleTypeParams = StatusRuleParams;
type MonitorStatusActionGroups = ActionGroupIdsOf<typeof MONITOR_STATUS>;
type MonitorStatusRuleTypeState = SyntheticsCommonState;
type MonitorStatusAlertState = SyntheticsMonitorStatusAlertState;
type MonitorStatusAlertContext = AlertContext;
type MonitorStatusAlert = ObservabilityUptimeAlert;

export type StatusRuleExecutorOptions = RuleExecutorOptions<
  MonitorStatusRuleTypeParams,
  MonitorStatusRuleTypeState,
  MonitorStatusAlertState,
  MonitorStatusAlertContext,
  MonitorStatusActionGroups,
  MonitorStatusAlert
>;

export interface MonitorSummaryStatusRule {
  reason: string;
  status: string;
  configId: string;
  hostName: string;
  monitorId: string;
  checkedAt: string;
  monitorUrl: string;
  locationId: string;
  monitorType: string;
  monitorName: string;
  locationName: string;
  lastErrorMessage: string;
  stateId: string | null;
  monitorUrlLabel: string;
  monitorTags?: string[];
  downThreshold?: number;
  checks?: {
    total: number;
    down: number;
  };
  timestamp: string;
  pendingLastRunAt?: string;
}
