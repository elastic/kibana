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

export interface BuildReasonMessageUtilArgs extends BuildReasonMessageArgs {
  type?: 'eql' | 'ml' | 'query' | 'threatMatch' | 'threshold';
}

export type BuildReasonMessage = (args: BuildReasonMessageArgs) => string;

/**
 * Currently all security solution rule types share a common reason message string. This function composes that string
 * In the future there may be different configurations based on the different rule types, so the plumbing has been put in place
 * to more easily allow for this in the future.
 * @export buildCommonReasonMessage - is only exported for testing purposes, and only used internally here.
 */
export const buildReasonMessageUtil = ({ rule, mergedDoc }: BuildReasonMessageUtilArgs) => {
  if (!rule) {
    // This should never happen, but in case, better to not show a malformed string
    return '';
  }
  let eventCategory;
  let fileName;
  let hostName;
  let processName;
  let processParentName;
  let sourceAddress;
  let sourcePort;
  let destinationAddress;
  let destinationPort;
  let userName;
  if (mergedDoc?.fields) {
    destinationAddress = mergedDoc.fields['destination.address'] ?? null;
    destinationPort = mergedDoc.fields['destination.port'] ?? null;
    eventCategory = mergedDoc.fields['event.category'] ?? null;
    fileName = mergedDoc.fields['file.name'] ?? null;
    hostName = mergedDoc.fields['host.name'] ?? null;
    processName = mergedDoc.fields['process.name'] ?? null;
    processParentName = mergedDoc.fields['process.parent.name'] ?? null;
    sourceAddress = mergedDoc.fields['source.address'] ?? null;
    sourcePort = mergedDoc.fields['source.port'] ?? null;
    userName = mergedDoc.fields['user.name'] ?? null;
  }

  const getFieldTemplateValue = (field: string | string[] | undefined | null): string => {
    if (!field || !field.length || (field.length === 1 && field[0] === '-')) return 'null';
    return Array.isArray(field) ? field.join(', ') : field;
  };

  return i18n.translate('xpack.securitySolution.detectionEngine.signals.alertReasonDescription', {
    defaultMessage: `{eventCategory} event with
      {processName, select, null {} other {{whitespace}process {processName},} }
      {processParentName, select, null {} other {{whitespace}parent process {processParentName},} }
      {fileName, select, null {} other {{whitespace}file {fileName},} }
      {sourceAddress, select, null {} other {{whitespace}source {sourceAddress}:{sourcePort},} }
      {destinationAddress, select, null {} other {{whitespace}destination {destinationAddress}:{destinationPort},}}
      {userName, select, null {} other {{whitespace}by {userName}} }
      {hostName, select, null {} other {{whitespace}on {hostName}} }
      created {alertSeverity} alert {alertName}.`,
    values: {
      alertName: rule.name,
      alertSeverity: rule.severity,
      alertRiskScore: rule.risk_score,
      destinationAddress: getFieldTemplateValue(destinationAddress),
      destinationPort: getFieldTemplateValue(destinationPort),
      eventCategory: getFieldTemplateValue(eventCategory),
      fileName: getFieldTemplateValue(fileName),
      hostName: getFieldTemplateValue(hostName),
      processName: getFieldTemplateValue(processName),
      processParentName: getFieldTemplateValue(processParentName),
      sourceAddress: getFieldTemplateValue(sourceAddress),
      sourcePort: getFieldTemplateValue(sourcePort),
      userName: getFieldTemplateValue(userName),
      whitespace: ' ', // there isn't support for the unicode /u0020 for whitespace, and leading spaces are deleted, so to prevent double-whitespace explicitly passing the space in.
    },
  });
};

export const buildReasonMessageForEqlAlert = (args: BuildReasonMessageArgs) =>
  buildReasonMessageUtil({ ...args, type: 'eql' });

export const buildReasonMessageForMlAlert = (args: BuildReasonMessageArgs) =>
  buildReasonMessageUtil({ ...args, type: 'ml' });

export const buildReasonMessageForQueryAlert = (args: BuildReasonMessageArgs) =>
  buildReasonMessageUtil({ ...args, type: 'query' });

export const buildReasonMessageForThreatMatchAlert = (args: BuildReasonMessageArgs) =>
  buildReasonMessageUtil({ ...args, type: 'threatMatch' });

export const buildReasonMessageForThresholdAlert = (args: BuildReasonMessageArgs) =>
  buildReasonMessageUtil({ ...args, type: 'threshold' });
