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
} from '../../../../common/alerting/logs/log_threshold/types';

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
  groupName: string
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.groupedCountAlertReasonDescription', {
    defaultMessage:
      '{actualCount, plural, one {{actualCount} log entry} other {{actualCount} log entries} } ({translatedComparator} {expectedCount}) match the conditions for {groupName}.',
    values: {
      actualCount,
      expectedCount,
      groupName,
      translatedComparator: ComparatorToi18nMap[comparator],
    },
  });

export const getReasonMessageForUngroupedRatioAlert = (
  actualRatio: number,
  expectedRatio: number,
  comparator: Comparator
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.ungroupedRatioAlertReasonDescription', {
    defaultMessage:
      'The log entries ratio is {actualRatio} ({translatedComparator} {expectedRatio}).',
    values: {
      actualRatio,
      expectedRatio,
      translatedComparator: ComparatorToi18nMap[comparator],
    },
  });

export const getReasonMessageForGroupedRatioAlert = (
  actualRatio: number,
  expectedRatio: number,
  comparator: Comparator,
  groupName: string
) =>
  i18n.translate('xpack.infra.logs.alerting.threshold.groupedRatioAlertReasonDescription', {
    defaultMessage:
      'The log entries ratio is {actualRatio} ({translatedComparator} {expectedRatio}) for {groupName}.',
    values: {
      actualRatio,
      expectedRatio,
      groupName,
      translatedComparator: ComparatorToi18nMap[comparator],
    },
  });
