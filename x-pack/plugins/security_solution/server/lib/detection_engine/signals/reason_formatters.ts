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

const buildCommonReasonMessage = ({
  alertName,
  alertSeverity,
  alertRiskScore,
  hostName,
  ruleType,
  timestamp,
  userName,
}: BuildReasonMessageArgs & { ruleType: string }) =>
  i18n.translate(`xpack.securitySolution.detectionEngine.signals.${ruleType}.reasonDescription`, {
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

export const buildReasonMessageForEqlAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args, ruleType: 'eql' });

export const buildReasonMessageForMlAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args, ruleType: 'machineLearning' });

export const buildReasonMessageForQueryAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args, ruleType: 'query' });

export const buildReasonMessageForThreatMatchAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args, ruleType: 'threatMatch' });

export const buildReasonMessageForThresholdAlert = (args: BuildReasonMessageArgs) =>
  buildCommonReasonMessage({ ...args, ruleType: 'threshold' });
