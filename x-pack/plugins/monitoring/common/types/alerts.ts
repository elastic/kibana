/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert, AlertTypeParams, SanitizedAlert } from '../../../alerts/common';
import { AlertParamType, AlertMessageTokenType, AlertSeverity } from '../enums';

export type CommonAlert = Alert<AlertTypeParams> | SanitizedAlert<AlertTypeParams>;

export interface CommonAlertStatus {
  states: CommonAlertState[];
  rawAlert: Alert<AlertTypeParams> | SanitizedAlert<AlertTypeParams>;
}

export interface CommonAlertState {
  firing: boolean;
  state: any;
  meta: any;
}

export interface CommonAlertFilter {
  nodeUuid?: string;
  shardId?: string;
}

export interface CommonAlertParamDetail {
  label: string;
  type?: AlertParamType;
}

export interface CommonAlertParamDetails {
  [name: string]: CommonAlertParamDetail | undefined;
}

export interface CommonAlertParams {
  duration: string;
  threshold?: number;
  limit?: string;
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
    | AlertState
    | AlertCpuUsageState
    | AlertDiskUsageState
    | AlertThreadPoolRejectionsState
    | AlertNodeState
  >;
  [x: string]: unknown;
}

export interface AlertState {
  cluster: AlertCluster;
  ccs?: string;
  ui: AlertUiState;
  [key: string]: unknown;
}

export interface AlertNodeState extends AlertState {
  nodeId: string;
  nodeName?: string;
  [key: string]: unknown;
}

export interface AlertCpuUsageState extends AlertNodeState {
  cpuUsage: number;
}

export interface AlertDiskUsageState extends AlertNodeState {
  diskUsage: number;
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
  resolvedMS?: number;
  severity: AlertSeverity;
  message: AlertMessage | null;
  lastCheckedMS: number;
  triggeredMS: number;
}

export interface AlertMessage {
  text: string; // Do this. #link this is a link #link
  code?: string;
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

export interface AlertMissingData extends AlertNodeStats {
  gapDuration: number;
}
export interface CCRReadExceptionsStats {
  remoteCluster: string;
  followerIndex: string;
  shardId: number;
  leaderIndex: string;
  lastReadException: { type: string; reason: string };
  clusterUuid: string;
  ccs: string;
}

export interface CCRReadExceptionsUIMeta extends CCRReadExceptionsStats {
  instanceId: string;
  itemLabel: string;
}

export interface AlertData {
  nodeName?: string;
  nodeId?: string;
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
  nodeName: string;
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
