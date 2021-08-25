/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { SignalSourceHit } from './types';

export interface BuildReasonMessageArgs {
  rule: RulesSchema;
  mergedDoc?: SignalSourceHit;
}

export type BuildReasonMessage = (args: BuildReasonMessageArgs) => string;

/**
 * Currently all security solution rule types share a common reason message string. This function composes that string
 * In the future there may be different configurations based on the different rule types, so the plumbing has been put in place
 * to more easily allow for this in the future.
 * @export buildCommonReasonMessage - is only exported for testing purposes, and only used internally here.
 */
export const buildCommonReasonMessage = ({ rule, mergedDoc }: BuildReasonMessageArgs) => {
  if (!rule) {
    // This should never happen, but in case, better to not show a malformed string
    return '';
  }
  let hostName;
  let userName;
  if (mergedDoc?.fields) {
    hostName = mergedDoc.fields['host.name'] != null ? mergedDoc.fields['host.name'] : hostName;
    userName = mergedDoc.fields['user.name'] != null ? mergedDoc.fields['user.name'] : userName;
  }

  const isFieldEmpty = (field: string | string[] | undefined | null) =>
    !field || !field.length || (field.length === 1 && field[0] === '-');

  return i18n.translate('xpack.securitySolution.detectionEngine.signals.alertReasonDescription', {
    defaultMessage:
      'Alert {alertName} created with a {alertSeverity} severity and risk score of {alertRiskScore}{userName, select, null {} other {{whitespace}by {userName}} }{hostName, select, null {} other {{whitespace}on {hostName}} }.',
    values: {
      alertName: rule.name,
      alertSeverity: rule.severity,
      alertRiskScore: rule.risk_score,
      hostName: isFieldEmpty(hostName) ? 'null' : hostName,
      userName: isFieldEmpty(userName) ? 'null' : userName,
      whitespace: ' ', // there isn't support for the unicode /u0020 for whitespace, and leading spaces are deleted, so to prevent double-whitespace explicitly passing the space in.
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
