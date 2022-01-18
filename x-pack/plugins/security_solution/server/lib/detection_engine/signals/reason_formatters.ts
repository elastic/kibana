/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getOr } from 'lodash/fp';
import { SignalSourceHit } from './types';

export interface BuildReasonMessageArgs {
  name: string;
  severity: string;
  mergedDoc?: SignalSourceHit;
}

export interface BuildReasonMessageUtilArgs extends BuildReasonMessageArgs {
  type?: 'eql' | 'ml' | 'query' | 'threatMatch' | 'threshold';
}

export type BuildReasonMessage = (args: BuildReasonMessageArgs) => string;

interface ReasonFields {
  destinationAddress?: string | string[] | null;
  destinationPort?: string | string[] | null;
  eventCategory?: string | string[] | null;
  fileName?: string | string[] | null;
  hostName?: string | string[] | null;
  processName?: string | string[] | null;
  processParentName?: string | string[] | null;
  sourceAddress?: string | string[] | null;
  sourcePort?: string | string[] | null;
  userName?: string | string[] | null;
}
const getFieldsFromDoc = (mergedDoc: SignalSourceHit) => {
  const reasonFields: ReasonFields = {};
  const docToUse = mergedDoc?.fields || mergedDoc;

  reasonFields.destinationAddress = getOr(null, 'destination.address', docToUse);
  reasonFields.destinationPort = getOr(null, 'destination.port', docToUse);
  reasonFields.eventCategory = getOr(null, 'event.category', docToUse);
  reasonFields.fileName = getOr(null, 'file.name', docToUse);
  reasonFields.hostName = getOr(null, 'host.name', docToUse);
  reasonFields.processName = getOr(null, 'process.name', docToUse);
  reasonFields.processParentName = getOr(null, 'process.parent.name', docToUse);
  reasonFields.sourceAddress = getOr(null, 'source.address', docToUse);
  reasonFields.sourcePort = getOr(null, 'source.port', docToUse);
  reasonFields.userName = getOr(null, 'user.name', docToUse);

  return reasonFields;
};
/**
 * Currently all security solution rule types share a common reason message string. This function composes that string
 * In the future there may be different configurations based on the different rule types, so the plumbing has been put in place
 * to more easily allow for this in the future.
 * @export buildCommonReasonMessage - is only exported for testing purposes, and only used internally here.
 */
export const buildReasonMessageUtil = ({
  name,
  severity,
  mergedDoc,
}: BuildReasonMessageUtilArgs) => {
  if (!mergedDoc) {
    // This should never happen, but in case, better to not show a malformed string
    return '';
  }
  const {
    destinationAddress,
    destinationPort,
    eventCategory,
    fileName,
    hostName,
    processName,
    processParentName,
    sourceAddress,
    sourcePort,
    userName,
  } = getFieldsFromDoc(mergedDoc);

  const fieldPresenceTracker = { hasFieldOfInterest: false };

  const getFieldTemplateValue = (
    field: string | string[] | undefined | null,
    isFieldOfInterest?: boolean
  ): string | null => {
    if (!field || !field.length || (field.length === 1 && field[0] === '-')) return null;
    if (isFieldOfInterest && !fieldPresenceTracker.hasFieldOfInterest)
      fieldPresenceTracker.hasFieldOfInterest = true;
    return Array.isArray(field) ? field.join(', ') : field;
  };

  return i18n.translate('xpack.securitySolution.detectionEngine.signals.alertReasonDescription', {
    defaultMessage: `{eventCategory, select, null {} other {{eventCategory}{whitespace}}}event\
{hasFieldOfInterest, select, false {} other {{whitespace}with}}\
{processName, select, null {} other {{whitespace}process {processName},} }\
{processParentName, select, null {} other {{whitespace}parent process {processParentName},} }\
{fileName, select, null {} other {{whitespace}file {fileName},} }\
{sourceAddress, select, null {} other {{whitespace}source {sourceAddress}}}{sourcePort, select, null {} other {:{sourcePort},}}\
{destinationAddress, select, null {} other {{whitespace}destination {destinationAddress}}}{destinationPort, select, null {} other {:{destinationPort},}}\
{userName, select, null {} other {{whitespace}by {userName}} }\
{hostName, select, null {} other {{whitespace}on {hostName}} } \
created {alertSeverity} alert {alertName}.`,
    values: {
      alertName: name,
      alertSeverity: severity,
      destinationAddress: getFieldTemplateValue(destinationAddress, true),
      destinationPort: getFieldTemplateValue(destinationPort, true),
      eventCategory: getFieldTemplateValue(eventCategory),
      fileName: getFieldTemplateValue(fileName, true),
      hostName: getFieldTemplateValue(hostName),
      processName: getFieldTemplateValue(processName, true),
      processParentName: getFieldTemplateValue(processParentName, true),
      sourceAddress: getFieldTemplateValue(sourceAddress, true),
      sourcePort: getFieldTemplateValue(sourcePort, true),
      userName: getFieldTemplateValue(userName),
      hasFieldOfInterest: fieldPresenceTracker.hasFieldOfInterest, // Tracking if we have any fields to show the 'with' word
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
