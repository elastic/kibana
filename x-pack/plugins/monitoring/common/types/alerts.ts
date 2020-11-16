/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert, SanitizedAlert } from '../../../alerts/common';
import { AlertParamType, AlertMessageTokenType, AlertSeverity } from '../enums';

export interface CommonBaseAlert {
  type?: string;
  label?: string;
  rawAlert?: Alert;
  isLegacy?: boolean;
}

export interface CommonAlertStatus {
  states: CommonAlertState[];
  rawAlert: Alert | SanitizedAlert;
}

export interface CommonAlertState {
  firing: boolean;
  state: any;
  meta: any;
}

export interface CommonAlertFilter {
  nodeUuid?: string;
}

export interface CommonAlertNodeUuidFilter extends CommonAlertFilter {
  nodeUuid: string;
}

export interface CommonAlertStackProductFilter extends CommonAlertFilter {
  stackProduct: string;
}

export interface CommonAlertParamDetail {
  label: string;
  type?: AlertParamType;
}

export interface CommonAlertParamDetails {
  [name: string]: CommonAlertParamDetail | undefined;
}

export interface CommonAlertParams {
  [name: string]: string | number;
}

export interface ThreadPoolRejectionsAlertParams {
  threshold: number;
  duration: string;
}

export interface AlertEnableAction {
  id: string;
  config: { [key: string]: any };
}

export interface AlertInstanceState {
  alertStates: Array<
    AlertState | AlertCpuUsageState | AlertDiskUsageState | AlertThreadPoolRejectionsState
  >;
  [x: string]: unknown;
}

export interface AlertState {
  cluster: AlertCluster;
  ccs?: string;
  ui: AlertUiState;
}

export interface AlertNodeState extends AlertState {
  nodeId: string;
  nodeName?: string;
}

export interface AlertCpuUsageState extends AlertNodeState {
  cpuUsage: number;
}

export interface AlertDiskUsageState extends AlertNodeState {
  diskUsage: number;
}

export interface AlertMissingDataState extends AlertState {
  stackProduct: string;
  stackProductUuid: string;
  stackProductName: string;
  gapDuration: number;
}

export interface AlertMemoryUsageState extends AlertNodeState {
  memoryUsage: number;
}

export interface AlertThreadPoolRejectionsState extends AlertState {
  rejectionCount: number;
  type: string;
  nodeId: string;
  nodeName?: string;
}

export interface AlertUiState {
  isFiring: boolean;
  severity: AlertSeverity;
  message: AlertMessage | null;
  resolvedMS: number;
  lastCheckedMS: number;
  triggeredMS: number;
}

export interface AlertMessage {
  text: string; // Do this. #link this is a link #link
  nextSteps?: AlertMessage[];
  tokens?: AlertMessageToken[];
}

export interface AlertMessageToken {
  startToken: string;
  endToken?: string;
  type: AlertMessageTokenType;
}

export interface AlertMessageLinkToken extends AlertMessageToken {
  url?: string;
}

export interface AlertMessageTimeToken extends AlertMessageToken {
  isRelative: boolean;
  isAbsolute: boolean;
  timestamp: string | number;
}

export interface AlertMessageDocLinkToken extends AlertMessageToken {
  partialUrl: string;
}

export interface AlertCluster {
  clusterUuid: string;
  clusterName: string;
}

export interface AlertNodeStats {
  clusterUuid: string;
  nodeId: string;
  nodeName?: string;
  ccs?: string;
}

export interface AlertCpuUsageNodeStats extends AlertNodeStats {
  cpuUsage: number;
  containerUsage: number;
  containerPeriods: number;
  containerQuota: number;
}

export interface AlertThreadPoolRejectionsStats {
  clusterUuid: string;
  nodeId: string;
  nodeName: string;
  rejectionCount: number;
  ccs?: string;
}

export interface AlertDiskUsageNodeStats extends AlertNodeStats {
  diskUsage: number;
}

export interface AlertMemoryUsageNodeStats extends AlertNodeStats {
  memoryUsage: number;
}

export interface AlertMissingData {
  stackProduct: string;
  stackProductUuid: string;
  stackProductName: string;
  clusterUuid: string;
  gapDuration: number;
  ccs?: string;
}

export interface AlertData {
  instanceKey: string;
  clusterUuid: string;
  ccs?: string;
  shouldFire?: boolean;
  severity: AlertSeverity;
  meta: any;
}

export interface LegacyAlert {
  prefix: string;
  message: string;
  resolved_timestamp: string;
  metadata: LegacyAlertMetadata;
  nodes?: LegacyAlertNodesChangedList;
}

export interface LegacyAlertMetadata {
  severity: number;
  cluster_uuid: string;
  time: string;
  link: string;
}

export interface LegacyAlertNodesChangedList {
  removed: { [nodeName: string]: string };
  added: { [nodeName: string]: string };
  restarted: { [nodeName: string]: string };
}
