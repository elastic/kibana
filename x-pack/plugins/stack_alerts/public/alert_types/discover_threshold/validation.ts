/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DiscoverThresholdAlertParams } from './types';
import { ValidationResult, builtInComparators } from '../../../../triggers_actions_ui/public';

export const validateExpression = (alertParams: DiscoverThresholdAlertParams): ValidationResult => {
  const { threshold, timeWindowSize, thresholdComparator } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    timeWindowSize: new Array<string>(),
    threshold0: new Array<string>(),
    threshold1: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }
  if (!threshold || threshold.length === 0 || threshold[0] === undefined) {
    errors.threshold0.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold0 is required.',
      })
    );
  }
  if (
    thresholdComparator &&
    builtInComparators[thresholdComparator].requiredValues > 1 &&
    (!threshold ||
      threshold[1] === undefined ||
      (threshold && threshold.length < builtInComparators[thresholdComparator!].requiredValues))
  ) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold1 is required.',
      })
    );
  }
  if (threshold && threshold.length === 2 && threshold[0] > threshold[1]) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.greaterThenThreshold0Text', {
        defaultMessage: 'Threshold1 should be > Threshold0.',
      })
    );
  }
  return validationResult;
};
