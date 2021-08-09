/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface BuildReasonMessageArgs {
  alertName: string;
  alertSeverity: string;
  alertRiskScore: number;
  userName: string;
  timestamp: string;
  hostName: string;
}

export type BuildReasonMessage = (args: BuildReasonMessageArgs) => string;

export const buildReasonMessageForEqlAlert = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.eql.eqlAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      hostName,
      timestamp,
      userName,
    },
  });

export const buildReasonMessageForMlAlert = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.mlAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      hostName,
      timestamp,
      userName,
    },
  });

export const buildReasonMessageForQueryAlert = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.queryAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      hostName,
      timestamp,
      userName,
    },
  });

export const buildReasonMessageForThreatMatchAlert = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.signals.threatMatchAlertReasonDescription',
    {
      defaultMessage:
        'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} by {userName} on {hostName}',
      values: {
        alertName,
        alertSeverity,
        alertRiskScore,
        hostName,
        timestamp,
        userName,
      },
    }
  );

export const buildReasonMessageForThresholdAlert = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.thresholdAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      hostName,
      timestamp,
      userName,
    },
  });
