/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getReasonMessageForEqlAlert = (
  alertName: string,
  alertSeverity: number,
  alertRiskScore: number,
  userName: string,
  hostName: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.eql.eqlAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at timestamp with a {alertSeverity} severity and {alertRiskScore} risk score by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      userName,
      hostName,
    },
  });

export const getReasonMessageForMlAlert = (
  alertName: string,
  alertSeverity: number,
  alertRiskScore: number,
  userName: string,
  hostName: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.mlAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at timestamp with a {alertSeverity} severity and {alertRiskScore} risk score by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      userName,
      hostName,
    },
  });

export const getReasonMessageForQueryAlert = (
  alertName: string,
  alertSeverity: number,
  alertRiskScore: number,
  userName: string,
  hostName: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.queryAlertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created at timestamp with a {alertSeverity} severity and {alertRiskScore} risk score by {userName} on {hostName}',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      userName,
      hostName,
    },
  });

export const getReasonMessageForThreatMatchAlert = (
  alertName: string,
  alertSeverity: number,
  alertRiskScore: number,
  userName: string,
  hostName: string
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.signals.threatMatchAlertReasonDescription',
    {
      defaultMessage:
        'Alert {alertName} created at timestamp with a {alertSeverity} severity and {alertRiskScore} risk score by {userName} on {hostName}',
      values: {
        alertName,
        alertSeverity,
        alertRiskScore,
        userName,
        hostName,
      },
    }
  );

export const getReaosnMessageForThresholdAlert = (
  alertName: string,
  alertSeverity: number,
  alertRiskScore: number,
  userName: string,
  hostName: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.signals.thresholdAlertReasonDescription', {
    defaultMessage:
      '{groupName}: The log entries ratio is {alertName} ({translatedComparator} {alertSeverity}).',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      userName,
      hostName,
    },
  });
