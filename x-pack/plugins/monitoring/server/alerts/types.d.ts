/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment';
import { AlertExecutorOptions } from '../../../alerts/server';
import { AlertClusterStateState, AlertCommonPerClusterMessageTokenType } from './enums';

export interface AlertLicense {
  status: string;
  type: string;
  expiryDateMS: number;
  clusterUuid: string;
}

export interface AlertClusterState {
  state: AlertClusterStateState;
  clusterUuid: string;
}

export interface AlertCommonState {
  [clusterUuid: string]: AlertCommonPerClusterState;
}

export interface AlertCommonPerClusterState {
  ui: AlertCommonPerClusterUiState;
}

export interface AlertClusterStatePerClusterState extends AlertCommonPerClusterState {
  state: AlertClusterStateState;
}

export interface AlertLicensePerClusterState extends AlertCommonPerClusterState {
  expiredCheckDateMS: number;
}

export interface AlertCommonPerClusterUiState {
  isFiring: boolean;
  severity: number;
  message: AlertCommonPerClusterMessage | null;
  resolvedMS: number;
  lastCheckedMS: number;
  triggeredMS: number;
}

export interface AlertCommonPerClusterMessage {
  text: string; // Do this. #link this is a link #link
  tokens?: AlertCommonPerClusterMessageToken[];
}

export interface AlertCommonPerClusterMessageToken {
  startToken: string;
  endToken?: string;
  type: AlertCommonPerClusterMessageTokenType;
}

export interface AlertCommonPerClusterMessageLinkToken extends AlertCommonPerClusterMessageToken {
  url?: string;
}

export interface AlertCommonPerClusterMessageTimeToken extends AlertCommonPerClusterMessageToken {
  isRelative: boolean;
  isAbsolute: boolean;
}

export interface AlertLicensePerClusterUiState extends AlertCommonPerClusterUiState {
  expirationTime: number;
}

export interface AlertCommonCluster {
  clusterUuid: string;
  clusterName: string;
}

export interface AlertCommonExecutorOptions extends AlertExecutorOptions {
  state: AlertCommonState;
}

export interface AlertCommonParams {
  dateFormat: string;
  timezone: string;
}
