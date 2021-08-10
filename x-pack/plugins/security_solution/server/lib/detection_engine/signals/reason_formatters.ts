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
  userName?: string;
  timestamp: string;
  hostName?: string;
}

export type BuildReasonMessage = (args: BuildReasonMessageArgs) => string;

const buildCommonReasonMessage = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  timestamp,
  userName,
}: BuildReasonMessageArgs) => {
  const isFieldEmpty = (field: string | string[] | undefined | null) =>
    !field || !field.length || (field.length === 1 && field[0] === '-');

  return i18n.translate(`xpack.securitySolution.detectionEngine.signals.alertReasonDescription`, {
    defaultMessage:
      'Alert {alertName} created at {timestamp} with a {alertSeverity} severity and risk score of {alertRiskScore} {userName, select, null {} other {by {userName} } } {hostName, select, null {} other {on {hostName} } }',
    values: {
      alertName,
      alertSeverity,
      alertRiskScore,
      hostName: isFieldEmpty(hostName) ? 'null' : hostName,
      timestamp,
      userName: isFieldEmpty(userName) ? 'null' : userName,
    },
  });
};

export const buildReasonMessageForEqlAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args });

export const buildReasonMessageForMlAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args });

export const buildReasonMessageForQueryAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args });

export const buildReasonMessageForThreatMatchAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args });

export const buildReasonMessageForThresholdAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args });
