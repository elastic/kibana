/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UiSettingsServiceStart, ILegacyCustomClusterClient, Logger } from 'kibana/server';
import { AlertClusterHealthType, AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { MonitoringConfig } from '../config';

export interface AlertEnableAction {
  id: string;
  config: { [key: string]: any };
}

export interface AlertLicense {
  status: string;
  type: string;
  expiryDateMS: number;
  clusterUuid: string;
  ccs: string;
}

export interface AlertClusterHealth {
  health: AlertClusterHealthType;
  clusterUuid: string;
  ccs: string | null;
}

export interface AlertInstanceState {
  alertStates: AlertState[];
}

export interface AlertState {
  cluster: AlertCluster;
  ccs: string | null;
  ui: AlertUiState;
}

export interface AlertClusterHealthState extends AlertState {
  health: AlertClusterHealthType;
}

export interface AlertCpuUsageState extends AlertState {
  cpuUsage: number;
  nodeId: string;
  nodeName: string;
}

export interface AlertNodesChangedState extends AlertState {
  node: AlertClusterStatsNode;
}

export interface AlertVersionMismatchState extends AlertState {
  versions: AlertVersions;
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

export interface AlertLicenseUiState extends AlertUiState {
  expirationTime: number;
}

export interface AlertCluster {
  clusterUuid: string;
  clusterName: string;
}

export interface AlertParams {
  dateFormat: string;
  timezone: string;
}

export interface AlertCreationParameters {
  getUiSettingsService: () => Promise<UiSettingsServiceStart>;
  monitoringCluster: ILegacyCustomClusterClient;
  getLogger: (...scopes: string[]) => Logger;
  config: MonitoringConfig;
  kibanaUrl: string;
}

export interface AlertCpuUsageNodeStats {
  clusterUuid: string;
  nodeId: string;
  nodeName: string;
  cpuUsage: number;
  containerUsage: number;
  containerPeriods: number;
  containerQuota: number;
  ccs: string | null;
}

export interface AlertClusterStatsNodes {
  clusterUuid: string;
  recentNodes: AlertClusterStatsNode[];
  priorNodes: AlertClusterStatsNode[];
  ccs: string | null;
}

export interface AlertClusterStatsNode {
  nodeUuid: string;
  nodeEphemeralId: string;
  nodeName: string;
}

export interface AlertData {
  instanceKey: string;
  clusterUuid: string;
  ccs: string | null;
  shouldFire: boolean;
  severity: AlertSeverity;
  meta: any;
}

export interface AlertVersions {
  clusterUuid: string;
  ccs: string | null;
  versions: string[];
}

export interface LegacyAlert {
  prefix: string;
  message: string;
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
