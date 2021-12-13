/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Comparator,
  ComparatorToi18nMap,
  TimeUnit,
} from '../../../../common/alerting/logs/log_threshold/types';

// TODO: Do we need to i18n the returned value?
const getTimeUnitFromOneChart = (shortcut: TimeUnit): string => {
  switch (shortcut) {
    case 's':
      return 'sec';
    case 'm':
      return 'min';
    case 'h':
      return 'hour';
    case 'd':
      return 'day';
  }
};

export const getReasonMessageForUngroupedCountAlert = (
  actualCount: number,
  expectedCount: number,
  comparator: Comparator
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.ungroupedCountAlertReasonDescription', {
    defaultMessage:
      '{actualCount, plural, one {{actualCount} log entry} other {{actualCount} log entries} } ({translatedComparator} {expectedCount}) match the conditions.',
    values: {
      actualCount,
      expectedCount,
      translatedComparator: ComparatorToi18nMap[comparator],
    },
  });

export const getReasonMessageForGroupedCountAlert = (
  actualCount: number,
  expectedCount: number,
  comparator: Comparator,
  groupName: string,
  timeSize: number,
  timeUnit: TimeUnit
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.groupedCountAlertReasonDescription', {
    defaultMessage:
      '{actualCount, plural, one {{actualCount} log entry} other {{actualCount} log entries}} in the last ({timeSize} {timeUnit}) for {groupName}. Alert when ({translatedComparator} {expectedCount}).',
    values: {
      actualCount,
      expectedCount,
      groupName,
      translatedComparator: ComparatorToi18nMap[comparator],
      timeSize,
      timeUnit: getTimeUnitFromOneChart(timeUnit),
    },
  });

export const getReasonMessageForUngroupedRatioAlert = (
  actualRatio: number,
  expectedRatio: number,
  comparator: Comparator,
  timeSize: number,
  timeUnit: TimeUnit
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.ungroupedRatioAlertReasonDescription', {
    defaultMessage:
      'The ratio of selected logs is {actualRatio} in the last ({timeSize} {timeUnit}). Alert when ({translatedComparator} {expectedRatio}).',
    values: {
      actualRatio,
      expectedRatio,
      translatedComparator: ComparatorToi18nMap[comparator],
      timeSize,
      timeUnit: getTimeUnitFromOneChart(timeUnit),
    },
  });

export const getReasonMessageForGroupedRatioAlert = (
  actualRatio: number,
  expectedRatio: number,
  comparator: Comparator,
  groupName: string,
  timeSize: number,
  timeUnit: TimeUnit
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.groupedRatioAlertReasonDescription', {
    defaultMessage:
      'The ratio of selected logs is {actualRatio} in the last ({timeSize} {timeUnit}) for {groupName}. Alert when ({translatedComparator} {expectedRatio}).',
    values: {
      actualRatio,
      expectedRatio,
      groupName,
      translatedComparator: ComparatorToi18nMap[comparator],
      timeSize,
      timeUnit: getTimeUnitFromOneChart(timeUnit),
    },
  });
