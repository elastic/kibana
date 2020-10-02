/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertInstanceState as BaseAlertInstanceState } from '../../../alerts/server';

export interface AlertEnableAction {
  id: string;
  config: { [key: string]: any };
}

export interface AlertInstanceState {
  alertStates: Array<AlertState | AlertCpuUsageState | AlertDiskUsageState>;
  [x: string]: unknown;
}

export interface AlertState {
  cluster: AlertCluster;
  ccs?: string;
  ui: AlertUiState;
}

export interface AlertCpuUsageState extends AlertState {
  cpuUsage: number;
  nodeId: string;
  nodeName: string;
}

export interface AlertMissingDataState extends AlertState {
  stackProduct: string;
  stackProductUuid: string;
  stackProductName: string;
  gapDuration: number;
}

export interface AlertDiskUsageState extends AlertState {
  diskUsage: number;
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

export interface AlertCpuUsageNodeStats {
  clusterUuid: string;
  nodeId: string;
  nodeName: string;
  cpuUsage: number;
  containerUsage: number;
  containerPeriods: number;
  containerQuota: number;
  ccs?: string;
}

export interface AlertDiskUsageNodeStats {
  clusterUuid: string;
  nodeId: string;
  nodeName: string;
  diskUsage: number;
  ccs?: string;
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
  shouldFire: boolean;
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
